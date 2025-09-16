import { User } from "../models/user.model.js";
import { OAuth2Client } from "google-auth-library";
import { ApiResponse } from "../utils/ApiResponse.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const handleGoogleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const ticketPayload = ticket.getPayload();
    const { sub: googleId, name, email, picture } = ticketPayload;
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      const createdUser = await User.create({
        email,
        fullName: name,
        userName: name.slice(0, 3) + googleId.slice(0, 3),
        googleId,
        avatarUrl: picture,
      });
      const accessToken = await createdUser.generateAccessToken();
      const refreshToken = await createdUser.generateRefreshToken();
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      };
      res.cookie("refreshToken", refreshToken, options);
      res.cookie("accessToken", accessToken, options);
      // Send HTML response that will send a message back to the parent window
      // Prepare user data for response
      const userData = {
        _id: createdUser._id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        userName: createdUser.userName,
        avatarUrl: createdUser.avatarUrl,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt
      };

      const responseHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Sign In</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border-left-color: #0066ff;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              // Send message to parent window
              window.onload = function() {
                try {
                  window.opener.postMessage({
                    type: 'AUTH_SUCCESS',
                    accessToken: '${accessToken}',
                    refreshToken: '${refreshToken}',
                    user: ${JSON.stringify(userData)}
                  }, window.location.origin);
                  
                  // Show success message
                  document.getElementById('status').textContent = 'Authentication successful! Redirecting...';
                  
                  // Close the popup after a short delay
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                } catch (error) {
                  console.error('Error in auth popup:', error);
                  document.getElementById('status').textContent = 'Authentication successful! You can close this window.';
                }
              };
              
              // Handle cases where the window is closed or errors occur
              window.onerror = function(message, source, lineno, colno, error) {
                console.error('Error in auth popup:', { message, source, lineno, colno, error });
                document.getElementById('status').textContent = 'Authentication successful! Please close this window.';
                return true;
              };
            </script>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <p id="status">Completing authentication...</p>
            </div>
          </body>
        </html>
      `;
      
      res.status(200).send(responseHtml);
    } else {
      const accessToken = await existingUser.generateAccessToken();
      const refreshToken = await existingUser.generateRefreshToken();
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, 
      };
      res.cookie("refreshToken", refreshToken, options);
      res.cookie("accessToken", accessToken, options);
      // Send HTML response that will send a message back to the parent window
      // Prepare user data for response
      const userData = {
        _id: existingUser._id,
        fullName: existingUser.fullName,
        email: existingUser.email,
        userName: existingUser.userName,
        avatarUrl: existingUser.avatarUrl,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt
      };

      const responseHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Sign In</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border-left-color: #0066ff;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              // Send message to parent window
              window.onload = function() {
                try {
                  window.opener.postMessage({
                    type: 'AUTH_SUCCESS',
                    accessToken: '${accessToken}',
                    refreshToken: '${refreshToken}',
                    user: ${JSON.stringify(userData)}
                  }, window.location.origin);
                  
                  // Show success message
                  document.getElementById('status').textContent = 'Authentication successful! Redirecting...';
                  
                  // Close the popup after a short delay
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                } catch (error) {
                  console.error('Error in auth popup:', error);
                  document.getElementById('status').textContent = 'Authentication successful! You can close this window.';
                }
              };
              
              // Handle cases where the window is closed or errors occur
              window.onerror = function(message, source, lineno, colno, error) {
                console.error('Error in auth popup:', { message, source, lineno, colno, error });
                document.getElementById('status').textContent = 'Authentication successful! Please close this window.';
                return true;
              };
            </script>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <p id="status">Completing authentication...</p>
            </div>
          </body>
        </html>
      `;
      
      res.status(200).send(responseHtml);
    }
  } catch (error) {
    console.error("Error in Google auth:", error);
    // Send HTML response with error message
    const errorHtml = `
      <html>
        <head>
          <title>Google Sign In</title>
          <script>
            window.opener.postMessage({
              type: 'AUTH_ERROR',
              message: '${error.message || 'Authentication failed'}'
            }, window.location.origin);
            window.close();
          </script>
        </head>
        <body>
          <p>Authentication failed. You can close this window and try again.</p>
        </body>
      </html>
    `;
    
    res.status(500).send(errorHtml);
  }
};

export default handleGoogleLogin;
