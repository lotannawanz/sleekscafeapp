const path = require('path');

module.exports = {
    // Set mode to 'development' for easier debugging in the browser console
    // Change back to 'production' for final deployment if performance is critical
    mode: 'development',

    entry: './src/index.jsx', // ENTRY POINT: Your main application file

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public'), // OUTPUT DIRECTORY: 'public'
        // Ensure the path is relative for the browser
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            },
            // Rule to handle image files (like your logo)
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: 'asset/resource',
                generator: {
                    filename: '[name][ext]' // Keep original filename in public folder
                }
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    // Add devtool for source maps to debug in the browser
    devtool: 'source-map'
};