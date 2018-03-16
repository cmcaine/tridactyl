function o(object) {
    return Object.assign(Object.create(null), object)
}

const DEFAULTS = o({
    nmaps: o({
        o: 'fillcmdline open',
        O: 'current_url open',
        w: 'fillcmdline winopen',
        W: 'current_url winopen',
        t: 'fillcmdline tabopen',
        ']]': 'followpage next',
        '[[': 'followpage prev',
        '[c': 'urlincrement -1',
        ']c': 'urlincrement 1',
        T: 'current_url tabopen',
        yy: 'clipboard yank',
        ys: 'clipboard yankshort',
        yc: 'clipboard yankcanon',
        gh: 'home',
        gH: 'home true',
        p: 'clipboard open',
        P: 'clipboard tabopen',
        j: 'scrollline 10',
        k: 'scrollline -10',
        h: 'scrollpx -50',
        l: 'scrollpx 50',
        G: 'scrollto 100',
        gg: 'scrollto 0',
        $: 'scrollto 100 x',
        // "0": "scrollto 0 x", // will get interpreted as a count
        '^': 'scrollto 0 x',
        H: 'back',
        L: 'forward',
        d: 'tabclose',
        u: 'undo',
        r: 'reload',
        R: 'reloadhard',
        gi: 'focusinput -l',
        gt: 'tabnext_gt',
        gT: 'tabprev',
        'g^': 'tabfirst',
        g$: 'tablast',
        gr: 'reader',
        gu: 'urlparent',
        gU: 'urlroot',
        ':': 'fillcmdline',
        s: 'fillcmdline open search',
        S: 'fillcmdline tabopen search',
        M: 'gobble 1 quickmark',
        // "B": "fillcmdline bufferall",
        b: 'fillcmdline buffer',
        ZZ: 'qall',
        f: 'hint',
        F: 'hint -b',
        ';i': 'hint -i',
        ';I': 'hint -I',
        ';k': 'hint -k',
        ';y': 'hint -y',
        ';p': 'hint -p',
        ';r': 'hint -r',
        ';s': 'hint -s',
        ';S': 'hint -S',
        ';a': 'hint -a',
        ';A': 'hint -A',
        ';;': 'hint -;',
        ';#': 'hint -#',
        I: 'mode ignore',
        a: 'current_url bmark',
        A: 'bmark',
        zi: 'zoom 0.1 true',
        zo: 'zoom -0.1 true',
        zz: 'zoom 1',
        '.': 'repeat',
    }),

    autocmds: o({
        DocStart: o({
            'addons.mozilla.org': 'mode ignore',
        }),
    }),

    exaliases: o({
        alias: 'command',
        au: 'autocmd',
        b: 'buffer',
        bN: 'tabprev',
        bd: 'tabclose',
        bdelete: 'tabclose',
        bfirst: 'tabfirst',
        blast: 'tablast',
        bn: 'tabnext_gt',
        bnext: 'tabnext_gt',
        bp: 'tabprev',
        bprev: 'tabprev',
        o: 'open',
        q: 'tabclose',
        qa: 'qall',
        quit: 'tabclose',
        t: 'tabopen',
        tN: 'tabprev',
        tfirst: 'tabfirst',
        tlast: 'tablast',
        tn: 'tabnext_gt',
        tnext: 'tabnext_gt',
        to: 'tabopen',
        tp: 'tabprev',
        tprev: 'tabprev',
        w: 'winopen',
    }),

    followpagepatterns: o({
        next: '^(next|newer)\\b|»|>>',
        prev: '^(prev(ious)?|older)\\b|«|<<',
    }),

    searchengine: 'google',
    searchurls: o({
        google: 'https://www.google.com/search?q=',
        scholar: 'https://scholar.google.com/scholar?q=',
        googleuk: 'https://www.google.co.uk/search?q=',
        bing: 'https://www.bing.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        yahoo: 'https://search.yahoo.com/search?p=',
        twitter: 'https://twitter.com/search?q=',
        wikipedia: 'https://en.wikipedia.org/wiki/Special:Search/',
        youtube: 'https://www.youtube.com/results?search_query=',
        amazon:
            'https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=',
        amazonuk:
            'https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords=',
        startpage:
            'https://startpage.com/do/search?language=english&cat=web&query=',
        github: 'https://github.com/search?utf8=✓&q=',
        searx: 'https://searx.me/?category_general=on&q=',
        cnrtl: 'http://www.cnrtl.fr/lexicographie/',
        osm: 'https://www.openstreetmap.org/search?query=',
        mdn: 'https://developer.mozilla.org/en-US/search?q=',
        gentoo_wiki:
            'https://wiki.gentoo.org/index.php?title=Special%3ASearch&profile=default&fulltext=Search&search=',
        qwant: 'https://www.qwant.com/?q=',
    }),

    newtab: '',
    homepages: [],
    hintchars: 'hjklasdfgyuiopqwertnmzxcvb',
    hintfiltermode: 'simple', // "simple", "vimperator", "vimperator-reflow"

    ttsvoice: 'default', // chosen from the listvoices list, or "default"
    ttsvolume: 1, // 0 to 1
    ttsrate: 1, // 0.1 to 10
    ttspitch: 1, // 0 to 2
    theme: 'default', // currently available: "default", "dark"

    // either "nextinput" or "firefox"
    // If 'nextinput', <Tab> after gi brings selects the next input
    // If 'firefox', <Tab> selects the next selectable element, e.g. a link
    gimode: 'nextinput',

    // Default logging levels - 2 === WARNING
    logging: o({
        messaging: 2,
        cmdline: 2,
        controller: 2,
        hinting: 2,
        state: 2,
        excmd: 1,
    }),
})

export default DEFAULTS
