### Twitchbot
A twitch irc chatbot


### Setup Guide
- Install Deps `pnpm install`

- Copy `.env.example` into `.env` and update the variables with your own values. you can get your twitch app CLIENT_ID and CLIENT_SECRET [here](https://dev.twitch.tv/console/apps), just create an app or use an existing one. Also make sure to set the redirect uri in both twitch console and the .env file to something like: `https://<your_app_domain>/oauth`, `/oauth` is where the app will be listening for twitch auth responses

- To Generate your APP_SECRET you can use the following command: `openssl rand -base64 32`

- After all the env variables you can run the app: `pnpm dev`

- You will probably need to setup apache or ngx to proxy requests to your nodejs app, i use the following config:
    ```shell
    <VirtualHost *:80>
        ServerName your_app_domain.com
        # Proxy requests to the nodejs app
        ProxyPass / http://localhost:6969/ 
        
        ErrorLog ${APACHE_LOG_DIR}/your_app_domain.com/error.log    
        CustomLog ${APACHE_LOG_DIR}/your_app_domain.com/access.log combined
        RewriteEngine on
        RewriteCond %{SERVER_NAME} =your_app_domain.com
        RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
    </VirtualHost>
    ``` 