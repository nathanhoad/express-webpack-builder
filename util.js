const Path = require('path');
const FS = require('fs-extra');
const Webpack = require('webpack');
const format = require('date-fns/format');

function now() {
    return format(new Date(), 'h:mma');
}

function clearScreen() {
    // process.stdout.write('\033c');
}

function clearRequireCache(target) {
    Object.keys(require.cache).forEach(key => {
        if (key.includes(target)) {
            delete require.cache[key];
        }
    });

    Object.keys(module.constructor._pathCache).forEach(key => {
        delete module.constructor._pathCache[key];
    });
}

function guessRootPath() {
    if (process.env.APP_ROOT) return process.env.APP_ROOT;

    let currentDirectory = process.cwd();
    let projectDirectory = null;

    let levels = 50;
    while (currentDirectory.length > 0 && !projectDirectory && levels-- > 0) {
        if (
            FS.readdirSync(currentDirectory).includes('node_modules') ||
            FS.readdirSync(currentDirectory).includes('package.json')
        ) {
            projectDirectory = currentDirectory;
        } else {
            currentDirectory = Path.dirname(currentDirectory);
        }
    }

    return projectDirectory;
}

// Load the webpack config and apply hot reload options if needed
function getWebpackConfig(args, config) {
    config = config || {};
    args = args || [];

    clearRequireCache(`${config.appRootPath}/webpack.config`);
    let webpackConfig = require(`${config.appRootPath}/webpack.config`);
    if (typeof webpackConfig === 'function') {
        webpackConfig = webpackConfig(config);
    }

    if (args.includes('hot')) {
        let entry = config.entry;
        let host = `http://localhost:${config.devServerPort}`;

        if (typeof config.entry === 'string') {
            webpackConfig.entry = [
                `webpack-dev-server/client?${host}`,
                'webpack/hot/only-dev-server',
                'react-hot-loader/patch',
                webpackConfig.entry
            ];
        } else if (webpackConfig.entry instanceof Array) {
            webpackConfig.entry.unshift(
                `webpack-dev-server/client?${host}`,
                'webpack/hot/only-dev-server',
                'react-hot-loader/patch'
            );
        } else {
            Object.keys(webpackConfig.entry).forEach(entry => {
                if (typeof webpackConfig.entry[entry] === 'string') {
                    webpackConfig.entry[entry] = [
                        `webpack-dev-server/client?${host}`,
                        'webpack/hot/only-dev-server',
                        'react-hot-loader/patch',
                        webpackConfig.entry[entry]
                    ];
                } else {
                    webpackConfig.entry[entry].unshift(
                        `webpack-dev-server/client?${host}`,
                        'webpack/hot/only-dev-server',
                        'react-hot-loader/patch'
                    );
                }
            });
        }

        webpackConfig.output.publicPath = `${host}/assets/`;
        webpackConfig.plugins.push(new Webpack.HotModuleReplacementPlugin());
    }

    return webpackConfig;
}

function guessServerPath(config) {
    // Try and guess where the server index is...
    let defaultServerPath = 'app/server';
    try {
        const package = require(`${config.appRootPath}/package.json`);

        // Make sure it is requirable
        const testServer = require(package.main);
        if (typeof testServer.listen === 'function') {
            defaultServerPath = package.main.replace('/index.js', '');
        }
    } catch (e) {
        // Do nothing
    }

    return defaultServerPath;
}

module.exports = {
    now,
    clearScreen,
    clearRequireCache,
    guessRootPath,
    getWebpackConfig,
    guessServerPath
};
