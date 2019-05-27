import * as config from "@src/lib/config"
import * as controller from "@src/lib/controller"
import excmd_fillcmdline from "@src/lib/generated/fillcmdline"

export async function getRssLinks(): Promise<Array<{ type: string; url: string; title: string }>> {
    const seen = new Set<string>()
    return Array.from(document.querySelectorAll("a, link[rel='alternate']"))
        .filter((e: any) => typeof e.href === "string")
        .reduce((acc, e: any) => {
            let type = ""
            // Start by detecting type because url doesn't necessarily contain the words "rss" or "atom"
            if (e.type) {
                // if type doesn't match either rss or atom, don't include link
                if (e.type.indexOf("rss") < 0 && e.type.indexOf("atom") < 0) return acc
                type = e.type
            } else {
                // Making sure that we match either a dot or "xml" because "urss" and "atom" are actual words
                if (e.href.match(/(\.rss)|(rss\.xml)/i)) type = "application/rss+xml"
                else if (e.href.match(/(\.atom)|(atom\.xml)/i)) type = "application/atom+xml"
                else return acc
            }
            if (seen.has(e.href)) return acc
            seen.add(e.href)
            return acc.concat({ type, url: e.href, title: e.title || e.innerText } as { type: string; url: string; title: string })
        }, [])
}

export async function rssexec(url: string, type?: string, ...title: string[]) {
    if (!url || url === "") {
        const links = await getRssLinks()
        switch (links.length) {
            case 0:
                throw new Error("No rss link found on this page.")
                break
            case 1:
                url = links[0].url
                title = [links[0].title]
                type = links[0].type
                break
            default:
                return excmd_fillcmdline.fillcmdline("rssexec")
        }
    }
    let rsscmd = config.get("rsscmd")
    if (rsscmd.match("%[uty]")) {
        rsscmd = rsscmd
            .replace("%u", url)
            .replace("%t", title.join(" "))
            .replace("%y", type || "")
    } else {
        rsscmd += " " + url
    }
    // Need actual excmd parsing here.
    return controller.acceptExCmd(rsscmd)
}
