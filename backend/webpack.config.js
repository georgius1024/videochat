const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const basePackage = require('./package.json');

/* SETUP PRODUCTION PACKAGE */
const prodPackage = require('./package-prod.json');
prodPackage.name = basePackage.name;
prodPackage.version = basePackage.version;
prodPackage.description = basePackage.description;
prodPackage.dependencies = basePackage.dependencies;
prodPackage.author = basePackage.author;
prodPackage.license = basePackage.license;
fs.writeFileSync('./package-prod.json', JSON.stringify(prodPackage, null, 2));

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

const destination = path.join(__dirname, 'dist')

module.exports = {
  mode: 'production',
  entry: {
    server: path.join(__dirname, 'index.js')
  },
  target: 'node',
  output: {
    path: destination,
  },
  externals: nodeModules,
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less|pug)$/),
    new CleanWebpackPlugin(
      ['dist']
    ),
    new CopyWebpackPlugin(
    [
     {
      from: path.join(__dirname, 'public'),
      to: path.join(destination, 'public'),
      ignore: '*.map'
     },
     {
      from: path.join(__dirname, 'keys'),
      to: path.join(destination, 'keys'),
     },
     {
      from: path.join(__dirname, '.env.example'),
      to: path.join(destination, '.env'),
      toType: 'file'
     },
     {
      from: path.join(__dirname, 'package-prod.json'),
      to: path.join(destination, 'package.json'),
      toType: 'file'
     },
     {
      from: path.join(__dirname, 'readme.md'),
      to: path.join(destination, 'readme.md'),
      toType: 'file'
     }
    ])
  ],
}