module.exports = {
  apps: [
    {
      name: "polymer",
      cwd: "/var/www/polymer/current",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      exec_mode: "cluster",
      instances: 1,
      watch: false,
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
