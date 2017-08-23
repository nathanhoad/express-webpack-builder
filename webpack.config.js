require('dotenv').load({ silent: true });

const Webpack = require('webpack');
const AutoPrefixer = require('autoprefixer');
const HtmlPlugin = require('html-webpack-plugin');
const Path = require('path');
const { guessRootPath } = require('./util');

const APP_ROOT_PATH = guessRootPath();

module.exports = config => {
    config = Object.assign(
        {},
        {
            environment: process.env.NODE_ENV || 'development',
            appRootPath:
                config && config.appRootPath
                    ? config.appRootPath
                    : APP_ROOT_PATH,
            entry: 'app/client/index.js',
            showDeprecations: false
        },
        config
    );

    if (config.showDeprecations) {
        process.traceDeprecation = true;
    } else {
        process.noDeprecation = true;
    }

    const PRODUCTION = config.environment.toUpperCase() === 'PRODUCTION';

    let webpack_config = {
        cache: true,
        entry: {
            client: [`${config.appRootPath}/${config.entry}`]
        },
        output: {
            path: `${config.appRootPath}/build`,
            publicPath: '/assets/',
            filename: '[name]-[hash].js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader',
                    options: {
                        presets: ['react', 'es2015'],
                        plugins: ['react-hot-loader/babel']
                    }
                },
                {
                    test: /\.(css|scss)$/,
                    use: [
                        {
                            loader: 'style-loader'
                        },
                        PRODUCTION
                            ? {
                                  loader: 'css-loader',
                                  options: {
                                      modules: true,
                                      camelCase: true,
                                      minimize: true
                                  }
                              }
                            : {
                                  loader: 'css-loader',
                                  options: {
                                      modules: true,
                                      camelCase: true,
                                      sourcemaps: true,
                                      localIdentName:
                                          '[path][name]__[local]__[hash:base64:5]'
                                  }
                              },
                        {
                            loader: 'postcss-loader',
                            options: {
                                config: {
                                    path: `${__dirname}/postcss.config.js`
                                }
                            }
                        },
                        {
                            loader: 'sass-loader'
                        }
                    ]
                },
                {
                    test: /\.(jpg|png|gif|mp4|m4v|flv|mp3|wav|m4a)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[name]-[hash].[ext]'
                    }
                },
                {
                    test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/font-woff'
                    }
                },
                {
                    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'application/octet-stream'
                    }
                },
                {
                    test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'file-loader'
                },
                {
                    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        mimetype: 'image/svg+xml'
                    }
                },
                {
                    test: /\.html$/,
                    loader: 'html-loader'
                }
            ]
        },
        plugins: [
            new Webpack.LoaderOptionsPlugin({
                options: {
                    context: __dirname,
                    postcss: [AutoPrefixer()]
                }
            }),
            new Webpack.EnvironmentPlugin(Object.keys(process.env))
        ]
    };

    if (config.html_plugin) {
        webpack_config.plugins.push(config.html_plugin);
    } else if (config.template !== false) {
        let html_plugin_config = {
            minify: {
                keepClosingSlash: true,
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true
            }
        };

        if (config.template) {
            html_plugin_config.template = config.template;
            html_plugin_config.filename = Path.basename(config.template);
        }

        if (config.favicon) {
            html_plugin_config.favicon = config.favicon;
        }

        webpack_config.plugins.push(new HtmlPlugin(html_plugin_config));
    } else {
        webpack_config.plugins.push(new HtmlPlugin());
    }

    if (PRODUCTION) {
        webpack_config.plugins.push(new Webpack.optimize.UglifyJsPlugin());
    } else {
        webpack_config.plugins.push(new Webpack.NamedModulesPlugin());
    }

    return webpack_config;
};
