# Socket.IO Testing Guide with Postman

## Prerequisites
- Postman installed (version 8 or higher)
- NestJS server running on `localhost:7373`
- Valid JWT token for authentication

## Setting Up Socket.IO Request in Postman

1. Create a New Socket.IO Request
   - Click "New" button
   - Select "Socket.IO Request"
   - Enter URL: `http://localhost:7373/zikr-app`

2. Configure Headers
   - Go to "Headers" tab
   - Add Authorization header:
     ```
     Authorization: Bearer YOUR_JWT_TOKEN
     ```

3. Configure Socket.IO Settings
   - Go to "Socket.IO" tab
   - Set Transport to "websocket"
   - Set Namespace to "/zikr-app"
   - Enable "Auto Connect"

## Available Events

### 1. Join Group
```json
{
  "event": "joinGroup",
  "data": {
    "groupId": "your-group-id"
  }
}
```
Response:
```json
{
  "status": "success",
  "message": "Joined group successfully",
  "groupId": "your-group-id"
}
```

### 2. Send Notification
```json
{
  "event": "sendNotification",
  "data": {
    "userId": "target-user-id",
    "type": "GROUP_INVITATION",
    "title": "Test Notification",
    "message": "This is a test notification"
  }
}
```
Response:
```json
{
  "status": "success",
  "message": "Notification sent successfully",
  "notificationId": "generated-notification-id"
}
```

### 3. Book Pora
```json
{
  "event": "bookPora",
  "data": {
    "poraId": "your-pora-id"
  }
}
```
Response:
```json
{
  "status": "success",
  "message": "Pora booked successfully",
  "bookingId": "generated-booking-id"
}
```

### 4. Update Zikr Count
```json
{
  "event": "updateZikrCount",
  "data": {
    "groupId": "your-group-id",
    "count": 100
  }
}
```
Response:
```json
{
  "status": "success",
  "message": "Zikr count updated successfully",
  "groupId": "your-group-id",
  "count": 100
}
```

### 5. Send Invitation
```json
{
  "event": "sendInvitation",
  "data": {
    "groupId": "your-group-id",
    "userId": "target-user-id"
  }
}
```
Response:
```json
{
  "status": "success",
  "message": "Invitation sent successfully",
  "invitationId": "generated-invitation-id"
}
```

## Listening to Events

In Postman's Socket.IO interface, you can listen to various events:

1. Connection Events:
   - `connect`: When connection is established
   - `disconnect`: When connection is lost
   - `connect_error`: When connection fails

2. Group Events:
   - `groupUpdate`: When group information is updated
   - `groupDeleted`: When a group is deleted

3. Pora Events:
   - `poraBooked`: When a pora is booked
   - `poraCancelled`: When a booking is cancelled

4. Zikr Events:
   - `zikrCountUpdated`: When zikr count is updated

5. Notification Events:
   - `notification`: When a new notification is received

## Troubleshooting

1. Connection Issues
   - Verify server is running on port 7373
   - Check JWT token is valid and not expired
   - Ensure correct namespace ("/zikr-app")
   - Check transport is set to "websocket"

2. Authentication Issues
   - Verify JWT token format: `Bearer YOUR_JWT_TOKEN`
   - Check token expiration
   - Ensure user has necessary permissions

3. Event Issues
   - Verify event name matches exactly
   - Check data format matches expected schema
   - Ensure user has permission for the action

## Best Practices

1. Connection Management
   - Always disconnect after testing
   - Use "Auto Connect" for continuous testing
   - Monitor connection status in Postman

2. Event Testing
   - Test one event at a time
   - Verify responses for each event
   - Check error handling

3. Security
   - Never share JWT tokens
   - Use environment variables for sensitive data
   - Test with different user roles

## Environment Setup

1. Create a Postman Environment
   - Add variables:
     ```
     BASE_URL: http://localhost:7373
     JWT_TOKEN: your-jwt-token
     ```

2. Use Environment Variables
   - In URL: `{{BASE_URL}}/zikr-app`
   - In Headers: `Bearer {{JWT_TOKEN}}`

## Example Workflow

1. Connect to Socket.IO
2. Join a group
3. Send a notification
4. Listen for notification events
5. Update zikr count
6. Disconnect

## Error Codes and Messages

- `401`: Unauthorized - Invalid or missing token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `400`: Bad Request - Invalid data format
- `500`: Server Error - Internal server error

## Support

For additional support:
- Check server logs for detailed error messages
- Verify WebSocket gateway configuration
- Ensure all required services are running 