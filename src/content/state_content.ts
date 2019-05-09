import Logger from "@src/lib/logging"
const logger = new Logger("state")

export type ModeName =
    | "normal"
    | "insert"
    | "hint"
    | "ignore"
    | "gobble"
    | "input"

export class PrevInput {
    inputId: string
    tab: number
    jumppos?: number
}

export class State {
    private _mode: ModeName = "normal"
    private _cmdHistory: string[] = []
    private _prevInputs: PrevInput[] = [
        {
            inputId: undefined,
            tab: undefined,
            jumppos: undefined,
        },
    ]
    private _suffix: string = ""
    private _onChangedListeners: ContentStateChangedCallback[] = []

    get mode(): ModeName {
        return this._mode
    }

    set mode(newValue: ModeName) {
        const oldValue = this._mode
        this._mode = newValue
        this.runListeners("mode", oldValue, newValue)
    }

    get cmdHistory(): string[] {
        return this._cmdHistory
    }

    set cmdHistory(newValue: string[]) {
        const oldValue = this._cmdHistory
        this._cmdHistory = newValue
        this.runListeners("cmdHistory", oldValue, newValue)
    }

    get prevInputs(): PrevInput[] {
        return this._prevInputs
    }

    set prevInputs(newValue: PrevInput[]) {
        const oldValue = this._prevInputs
        this.prevInputs = newValue
        this.runListeners("prevInputs", oldValue, newValue)
    }

    get suffix(): string {
        return this._suffix
    }

    set suffix(newValue: string) {
        const oldValue = this._suffix
        this._suffix = newValue
        this.runListeners("suffix", oldValue, newValue)
    }

    public addContentStateChangedListener(
        callback: ContentStateChangedCallback,
    ) {
        this._onChangedListeners.push(callback)
    }

    private runListeners(property, oldValue, newValue) {
        logger.debug("Content state changed!", property, oldValue, newValue)
        for (const listener of this._onChangedListeners) {
            listener(property, this, oldValue)
        }
    }
}

export type ModeChangedListener = (oldMode: ModeName, newMode: ModeName) => void

export type ContentStateChangedCallback = (
    property: keyof State,
    newState: State,
    oldValue: any,
) => void

// TODO: Pass enough down from the content script that we can get rid
// of these globals.
export function addContentStateChangedListener(
    callback: ContentStateChangedCallback,
) {
    contentState.addContentStateChangedListener(callback)
}
export const contentState = new State()
