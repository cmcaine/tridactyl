const UglifyJSPlugin = require("uglifyjs-webpack-plugin")
const CopyWebPackPlugin = require("copy-webpack-plugin")
const webpack = require("webpack")
// const WebpackShellPlugin = require('webpack-shell-plugin')

module.exports = {
    entry: {
        background: "./src/background.ts",
        content: "./src/content.ts",
        commandline_frame: "./src/commandline_frame.ts",
        help: "./src/help.ts",
        newtab: "./src/newtab.ts",
        tutor: "./src/tutor.ts",
    },
    output: {
        filename: "[name].js",
        path: __dirname + "/build",
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "inline-source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
    },

    module: {
        loaders: [
            {
                test: /\.tsx?$/, // All ts and tsx files will be process by
                loaders: ["babel-loader", "awesome-typescript-loader"], // first babel-loader, then ts-loader
                exclude: /node_modules/, // ignore node_modules
            },
            {
                test: /\.jsx?$/, // all js and jsx files will be processed by
                loader: "babel-loader", // babel-loader
                exclude: /node_modules/, // ignore node_modules
            },
        ],
    },

    plugins: [
        // new UglifyJSPlugin({
        //     uglifyOptions: {
        //         ecma: 8
        //     }
        // }),
        // new WebpackShellPlugin({onBuildStart: [
        //     'mkdir -p generated/static',
        //     'scripts/excmds_macros.py',
        //     'scripts/newtab.md.sh',
        //     'scripts/make_docs.sh',
        // ]}),
        new CopyWebPackPlugin([
            { from: "src/manifest.json" },
            {
                from: "src/static",
                to: "static",
                ignore: ["*.psd", "*1024px.png"],
            },
            { from: "generated/static", to: "static" },
        ]),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify("production"),
            },
        }),
    ],
    // Fix css
    // https://github.com/webpack-contrib/css-loader/issues/447#issuecomment-285598881
    node: {
        fs: "empty",
    },
}
