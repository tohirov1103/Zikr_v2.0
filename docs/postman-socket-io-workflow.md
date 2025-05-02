# Zikr App Socket.IO Postman Workflow

This guide will help you set up and use the Postman collection for testing the Zikr App Socket.IO functionality.

## Setup Instructions

1. **Import the Collection and Environment**
   - Open Postman
   - Click "Import" button
   - Import both files:
     - `zikr-app-socket-io-collection.json`
     - `zikr-app-socket-io-environment.json`

2. **Configure the Environment**
   - Click on the "Environments" tab in Postman
   - Select "Zikr App Socket.IO Environment"
   - Update the following variables:
     - `jwt_token`: Your valid JWT token
     - `group_id`: ID of an existing group
     - `pora_id`: ID of an existing pora
     - `target_user_id`: ID of a user to send notifications/invitations to

3. **Select the Environment**
   - In the top-right corner of Postman, select "Zikr App Socket.IO Environment" from the dropdown

## Workflow Steps

The collection includes a complete workflow for testing Socket.IO functionality:

1. **Connect to Socket.IO**
   - Establishes connection to the Socket.IO server
   - Verifies authentication with JWT token

2. **Join Group**
   - Joins a specific group using the group_id from environment variables
   - Verifies group membership

3. **Send Notification**
   - Sends a test notification to a target user
   - Verifies notification delivery

4. **Book Pora**
   - Books a specific pora using the pora_id from environment variables
   - Verifies booking confirmation

5. **Update Zikr Count**
   - Updates the zikr count for a group
   - Verifies count update

6. **Send Invitation**
   - Sends a group invitation to a target user
   - Verifies invitation delivery

7. **Listen for Events**
   - Sets up listeners for various events
   - Monitors for incoming events

8. **Disconnect**
   - Properly disconnects from the Socket.IO server

## Running the Workflow

1. **Manual Execution**
   - Execute each request in sequence
   - Observe responses in the Postman console

2. **Collection Runner**
   - Click "Run Collection" button
   - Select "Zikr App Socket.IO" collection
   - Click "Run" to execute the entire workflow

## Troubleshooting

If you encounter issues:

1. **Connection Problems**
   - Verify the server is running on port 7373
   - Check your JWT token is valid and not expired
   - Ensure the namespace is correct ("/zikr-app")

2. **Authentication Issues**
   - Verify the JWT token format: `Bearer YOUR_JWT_TOKEN`
   - Check token expiration
   - Ensure user has necessary permissions

3. **Event Issues**
   - Verify event names match exactly
   - Check data format matches expected schema
   - Ensure user has permission for the action

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Postman Socket.IO Testing Guide](https://learning.postman.com/docs/sending-requests/websocket/socket-io/)
- [NestJS WebSockets Guide](https://docs.nestjs.com/websockets/gateways) 