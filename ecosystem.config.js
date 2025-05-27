module.exports = {
    apps: [
      {
        name: 'dsvendas-backend',
        script: 'server.js',
        cwd: 'C:\\Users\\paulo\\Desktop\\DSVENDAS\\backend',
        env: {
          NODE_ENV: 'production',
          PORT: 3001
        }
      },
      {
        name: 'dsvendas-frontend',
        script: 'serve.js',
        cwd: 'C:\\Users\\paulo\\Desktop\\DSVENDAS\\frontend',
        env: {
          NODE_ENV: 'production'
        }
      }
    ]
  };