# Express Webpack Builder

A simple Webpack builder that can run and hot reload a client app as well as automatically
restart an Express server when changes are detected.


## Usage

In your build script (eg. `bin/build`):

```javascript
#! /usr/bin/env node

const Builder = require('express-webpack-builder');

Builder.build(process.argv);
```

So when you run `bin/build hot` (assuming it has execute permission) 
you should get a server running at 
[http://localhost:5000](http://localhost:5000) with hot reload.

Client code changes will hot reload in the browser.

Server code changes will automatically restart the server.

The server location is guessed from your `package.json`'s `main` value or can be specified using a second parameter
to `build()`:

```javascript
Builder.build(process.argv, { 
    server_path: `${Builder.APP_ROOT_PATH}/server` 
});
```


## Webpack Config Helper

In your `webpack.config.js`:

```javascript
const Builder = require('express-webpack-builder');

module.exports = Builder.webpackConfig(); // Use the defaults
```

Or you can define more things:

```javascript
const Builder = require('express-webpack-builder');


module.exports = Builder.webpackConfig({
    template: `${Builder.APP_ROOT_PATH}/app/server/views/client.html`,
    favicon: `${Builder.APP_ROOT_PATH}/app/assets/favicon.png`
});
```

Or be even more specific...

```javascript
const Builder = require('express-webpack-builder');

let config = Builder.webpackConfig({
    html_plugin: new Builder.HtmlWebpackPlugin({
        filename: 'client.hbs',
        chunks: ['client'],
        inject: false,
        template: `${Builder.APP_ROOT_PATH}/app/server/views/client.hbs`,
        favicon: `${Builder.APP_ROOT_PATH}/app/assets/favicon.png`,
        minify: {
            keepClosingSlash: true,
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true
        }
    })
});

config.output.path = `${Builder.APP_ROOT_PATH}/dist`;

module.exports = config;
```

The `Builder.HtmlWebpackPlugin` is a shortcut to [`html-webpack-plugin`](https://www.npmjs.com/package/html-webpack-plugin) and uses the same config.
