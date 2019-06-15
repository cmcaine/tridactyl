/**
 * Background download-related functions
 */

import * as Native from "@src/lib/native"
import { getDownloadFilenameForUrl } from "@src/lib/url_util"

/** Construct an object URL string from a given data URL
 *
 * This is needed because feeding a data URL directly to downloads.download()
 * causes "Error: Access denied for URL"
 *
 * @param dataUrl   the URL to make an object URL from
 * @return          object URL that can be fed to the downloads API
 *
 */
function objectUrlFromDataUrl(dataUrl: URL): string {
    const b64 = dataUrl.pathname.split(",", 2)[1]

    const binaryF = atob(b64)

    const dataArray = new Uint8Array(binaryF.length)

    for (let i = 0, len = binaryF.length; i < len; ++i) {
        dataArray[i] = binaryF.charCodeAt(i)
    }

    return URL.createObjectURL(new Blob([dataArray]))
}

/** Download a given URL to disk
 *
 * Normal URLs are downloaded normally. Data URLs are handled more carefully
 * as it's not allowed in WebExt land to just call downloads.download() on
 * them
 *
 * @param url       the URL to download
 * @param saveAs    prompt user for a filename
 */
export async function downloadUrl(url: string, saveAs: boolean) {
    const urlToSave = new URL(url)

    let urlToDownload

    if (urlToSave.protocol === "data:") {
        urlToDownload = objectUrlFromDataUrl(urlToSave)
    } else {
        urlToDownload = urlToSave.href
    }

    const fileName = getDownloadFilenameForUrl(urlToSave)

    // Save location limitations:
    //  - download() can't save outside the downloads dir without popping
    //    the Save As dialog
    //  - Even if the dialog is popped, it doesn't seem to be possible to
    //    feed in the dirctory for next time, and FF doesn't remember it
    //    itself (like it does if you right-click-save something)

    const downloadPromise = browser.downloads.download({
        url: urlToDownload,
        filename: fileName,
        saveAs,
    })

    // TODO: at this point, could give feeback using the promise returned
    // by downloads.download(), needs status bar to show it (#90)
    // By awaiting the promise, we ensure that if it errors, the error will be
    // thrown by this function too.
    await downloadPromise
}

/** Dowload a given URL to disk
 *
 * This behaves mostly like downloadUrl, except that this function will use the native messenger in order to move the file to `saveAs`.
 *
 * Note: this requires a native messenger >=0.1.9. Make sure to nativegate for this.
 *
 * @param url the URL to download
 * @param saveAs If beginning with a slash, this is the absolute path the document should be moved to. If the first character of the string is a tilda, it will be expanded to an absolute path to the user's home directory. If saveAs begins with any other character, it will be considered a path relative to where the native messenger binary is located (e.g. "$HOME/.local/share/tridactyl" on linux).
 * If saveAs points to a directory, the name of the document will be inferred from the URL and the document will be placed inside the directory. If saveAs points to an already existing file, the document will be saved in the downloads directory but wont be moved to where it should be ; an error will be thrown. If any of the directories referred to in saveAs do not exist, the file will be kept in the downloads directory but won't be moved to where it should be.
 */
export async function downloadUrlAs(url: string, saveAs: string) {
    if (!(await Native.nativegate("0.1.9", true))) return
    const urlToSave = new URL(url)

    let urlToDownload

    if (urlToSave.protocol === "data:") {
        urlToDownload = objectUrlFromDataUrl(urlToSave)
    } else {
        urlToDownload = urlToSave.href
    }

    const fileName = getDownloadFilenameForUrl(urlToSave)

    const downloadId = await browser.downloads.download({
        conflictAction: "uniquify",
        url: urlToDownload,
        filename: fileName,
    })

    // We want to return a promise that will resolve once the file has been moved somewhere else
    return new Promise((resolve, reject) => {
        const onDownloadComplete = async downloadDelta => {
            if (downloadDelta.id !== downloadId) {
                return
            }
            // Note: this might be a little too drastic. For example, files that encounter a problem while being downloaded and the download of which is restarted by a user won't be moved
            // This seems acceptable for now as taking all states into account seems quite difficult
            if (
                downloadDelta.state &&
                downloadDelta.state.current !== "in_progress"
            ) {
                browser.downloads.onChanged.removeListener(onDownloadComplete)
                const downloadItem = (await browser.downloads.search({
                    id: downloadId,
                }))[0]
                if (downloadDelta.state.current === "complete") {
                    const operation = await Native.move(
                        downloadItem.filename,
                        saveAs,
                    )
                    if (operation.code !== 0) {
                        reject(
                            new Error(
                                `'${
                                    downloadItem.filename
                                }' could not be moved to '${saveAs}'. Make sure it doesn't already exist and that all directories of the path exist.`,
                            ),
                        )
                    } else {
                        resolve(operation)
                    }
                } else {
                    reject(
                        new Error(
                            `'${
                                downloadItem.filename
                            }' state not in_progress anymore but not complete either (would have been moved to '${saveAs}')`,
                        ),
                    )
                }
            }
        }
        browser.downloads.onChanged.addListener(onDownloadComplete)
    })
}

import * as Messaging from "@src/lib/messaging"

// Get messages from content
Messaging.addListener(
    "download_background",
    Messaging.attributeCaller({
        downloadUrl,
        downloadUrlAs,
    }),
)
