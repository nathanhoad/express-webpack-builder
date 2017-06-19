require('dotenv').load({ silent: true });

const Webpack = require('webpack');
const AutoPrefixer = require('autoprefixer');
const HtmlPlugin = require('html-webpack-plugin');

const APP_ROOT_PATH = require('app-root-path').toString();


module.exports = (config) => {
    config = Object.assign({}, {
        environment: process.env.NODE_ENV,
        app_root_path: config.app_root_path || APP_ROOT_PATH,
        show_deprecations: false,
        html_plugin: new HtmlPlugin()
    }, config);
    
    if (config.show_deprecations) {
        process.traceDeprecation = true
    } else {
        process.noDeprecation = true;
    }
    
    const PRODUCTION = config.environment.toUpperCase() === "PRODUCTION";
        
    let webpack_config = {
        cache: true,
        entry: {
            client: [`${config.app_root_path}/app/client/index.js`]
        },
        output: {
            path: `${config.app_root_path}/build`,
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
                        presets: ['react', 'es2015']
                    }
                },
                {
                    test: /\.(css|scss)$/,
                    use: [
                        { 
                            loader: 'style-loader' 
                        }, 
                        (PRODUCTION ?
                            { loader: 'css-loader', options: { modules: true, camelCase: true, minimize: true }}
                            : 
                            { loader: 'css-loader', options: { modules: true, camelCase: true, sourcemaps: true, localIdentName: '[name]__[local]__[hash:base64:5]' }}
                        ), 
                        { 
                            loader: 'postcss-loader'
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
                }
            ],
        },
        plugins: [
            new Webpack.LoaderOptionsPlugin({
                options: {
                    postcss: [AutoPrefixer()]
                }
            }),
            new Webpack.EnvironmentPlugin(Object.keys(process.env))
        ]
    };
    
    if (config.html_plugin) {
        webpack_config.plugins.push(config.html_plugin);
    }

    if (PRODUCTION) {
        webpack_config.plugins.push(new Webpack.optimize.UglifyJsPlugin());
    } else {
        webpack_config.plugins.push(new Webpack.NamedModulesPlugin());
    }


    return webpack_config;
}
