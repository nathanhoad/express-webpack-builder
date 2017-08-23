const Path = require('path');
const FS = require('fs-extra');
const Webpack = require('webpack');
const Listr = require('listr');
const Chalk = require('chalk');

const {
    now,
    clearScreen,
    clearRequireCache,
    guessRootPath,
    getWebpackConfig,
    guessServerPath
} = require('./util');

const APP_ROOT_PATH = guessRootPath();

const Tasks = {};

Tasks.clean = function(args, config) {
    args = args || [];
    config = config || {};

    let webpackConfig = getWebpackConfig(args, config);

    return new Promise((resolve, reject) => {
        FS.emptyDir(webpackConfig.output.path, err => {
            if (err) return reject(err);
            return resolve();
        });
    });
};

Tasks.build = function(args, config, task) {
    args = args || [];
    config = config || {};
    task = task || {}; // A Listr task

    if (args.includes('hot')) {
        task.title = `Building with ${Chalk.hex('#ff6a00').bold('hot reload')}`;
    } else {
        task.title = 'Building';
    }

    return new Promise((resolve, reject) => {
        let webpackConfig = getWebpackConfig(args, config);

        let compiler = Webpack(webpackConfig);
        if (process.env.NODE_ENV !== 'production') {
            compiler.apply(
                new Webpack.ProgressPlugin((percent, message) => {
                    task.output = '';
                    if (percent < 1) {
                        task.output = `${Math.floor(
                            percent * 100
                        )}% (${message})`;
                    }
                })
            );
        }

        compiler.run((err, stats) => {
            if (err) return reject(err);

            stats = stats.toJson();
            if (stats.errors.length == 0 && stats.warnings.length == 0) {
                task.title += ` ${Chalk.gray(
                    `finished in ${(stats.time / 1000)
                        .toFixed(1)
                        .replace(/\.0+/, '')} seconds`
                )}`;
            }

            return resolve(stats);
        });
    });
};

Tasks.run = function(args, config, task) {
    const WebpackDevServer = require('webpack-dev-server');
    const enableDestroy = require('server-destroy');

    args = args || [];
    config = config || {};
    task = task || {}; // A Listr task

    let webpackConfig = getWebpackConfig(args, config);

    return new Promise((resolve, reject) => {
        let serverPath = `${config.appRootPath}/${config.serverPath}`;
        let server;
        try {
            server = require(serverPath);
        } catch (error) {
            return reject(error);
        }

        if (typeof server.listen !== 'function') {
            return reject(
                new Error(
                    `${config.serverPath} exists but does not respond to 'listen()'`
                )
            );
        }

        process.on('uncaughtException', error => {
            clearScreen();
            console.error(error);
        });

        let listener;
        let compiler = Webpack(webpackConfig);
        let watcher;

        if (process.env.NODE_ENV !== 'production') {
            watcher = FS.watch(
                serverPath,
                { recursive: true },
                (event, filename) => {
                    // Purge all connections and close the server
                    listener.destroy();

                    // Load in any actual file changes
                    clearRequireCache(`${serverPath}/`);
                    server = require(serverPath);

                    listener = server.listen(5000, () => {
                        task.title = `Running at http://localhost:5000 ${Chalk.gray(
                            `updated at ${now()}`
                        )}`;
                        task.output = 'Press Ctrl+C to stop';
                    });

                    // Set up connection tracking so that we can destroy the server when a file changes
                    enableDestroy(listener);
                }
            );

            const startedAt = new Date();
            compiler.apply(
                new Webpack.ProgressPlugin((percent, message) => {
                    // Don't show the client building unless it has been a few seconds
                    if (new Date() - startedAt < 5000) return;

                    if (percent < 1) {
                        task.output = `${Math.floor(
                            percent * 100
                        )}% (${message})`;
                    } else {
                        task.title = `Running at http://localhost:5000 ${Chalk.gray(
                            `updated at ${now()}`
                        )}`;
                        task.output = 'Press Ctrl+C to stop';
                    }
                })
            );
        }

        var assetServer = new WebpackDevServer(compiler, {
            hot: true,
            hotOnly: true,
            overlay: true,
            contentBase: webpackConfig.output.build,
            publicPath: webpackConfig.output.publicPath,
            noInfo: true,
            quiet: true,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
        assetServer.listen(config.devServerPort, 'localhost', err => {
            if (err) return reject(err);

            listener = server.listen(5000, () => {
                task.title = `Running at http://localhost:5000`;
                task.output = 'Press Ctrl+C to stop';

                // Set up connection tracking so that we can destroy the server when a file changes
                enableDestroy(listener);
            });
        });
    });
};

module.exports = {
    APP_ROOT_PATH,

    getWebpackConfig(config) {
        return require('./webpack.config')(config);
    },

    build(args, config) {
        args = args || [];
        config = Object.assign(
            {},
            {
                appRootPath: APP_ROOT_PATH,
                devServerPort: 5050
            },
            config
        );

        let tasks = [
            {
                title: 'Clean',
                task: () => Tasks.clean(args, config)
            },
            {
                title: 'Build',
                task: (context, task) =>
                    Tasks.build(args, config, task).then(() => true)
            },
            {
                title: 'Run',
                enabled: () => args.includes('hot'),
                task(context, task) {
                    if (!config.serverPath) {
                        config.serverPath = guessServerPath(config);
                    }
                    return Tasks.run(args, config, task);
                }
            }
        ];

        return new Listr(tasks).run().catch(error => console.error(error));
    },

    HtmlWebpackPlugin: require('html-webpack-plugin')
};
