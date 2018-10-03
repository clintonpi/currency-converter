const autoprefixer = require('autoprefixer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');

const ENVIRONMENT = process.env.NODE_ENV;

const postCSSLoader = {
  loader: 'postcss-loader',
  options: {
    sourceMap: true,
    plugins() {
      return [
        autoprefixer({
          browsers: ['last 3 versions']
        })
      ];
    }
  }
};

const config = {
  entry: './src/js/script.js',
  output: {
    filename: 'js/script.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'clean-css-loader', postCSSLoader]
      },
      {
        test: /\.html$/,
        use: ['file-loader?name=[name].html', 'html-minifier-loader']
      },
      {
        test: /\.(png|ico)$/,
        loader: 'file-loader?name=images/[name].[ext]'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(ENVIRONMENT)
      }
    }),
    new webpack.DefinePlugin({ 'global.GENTLY': false }),
    new webpack.NoEmitOnErrorsPlugin(),
    new CopyWebpackPlugin([
      { from: 'src/sw.js', to: 'sw.js' },
      { from: 'src/manifest.json', to: 'manifest.json' }
    ])
  ],
  devServer: {
    contentBase: './dist',
    historyApiFallback: true,
    inline: true,
    open: true
  },
  devtool: 'source-map',
  stats: {
    colors: true,
    reasons: true
  },
  target: 'web'
};

if (ENVIRONMENT === 'production') {
  const uglifyjsOptions = {
    sourceMap: true,
    extractComments: true,
    uglifyOptions: {
      compress: {
        drop_console: true
      }
    }
  };

  const imageminOptions = {
    pngquant: {
      quality: '65-85'
    }
  };

  // minify JS, compress images
  config.plugins.push(new UglifyJsPlugin(uglifyjsOptions), new ImageminPlugin(imageminOptions));
}

module.exports = config;
