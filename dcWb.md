# Zikr App WebSocket Events Reference

## Client to Server Events

These are events that your iOS app should emit to the server:

| Event Name | Payload | Description |
|------------|---------|-------------|
| `join_group` | `{ groupId: String }` | Join a group's real-time channel to receive group events |
| `leave_group` | `{ groupId: String }` | Leave a group's real-time channel |
| `book_pora` | `{ poraId: String, groupId: String }` | Book a pora (juz) for reading |
| `complete_pora` | `{ bookingId: String }` | Mark a booked pora as completed |
| `update_zikr_count` | `{ groupId: String, zikrId: String, count: Int }` | Update zikr count |
| `send_invitation` | `{ receiverId: String, groupId: String }` | Send group invitation to a user |
| `respond_to_invitation` | `{ notificationId: String, accept: Bool }` | Accept or reject an invitation |
| `get_notifications` | None | Request unread notifications |
| `mark_notification_read` | `{ notificationId: String }` | Mark notification as read |

## Server to Client Events

These are events that your iOS app should listen for from the server:

| Event Name | Payload | Description |
|------------|---------|-------------|
| `connection_status` | `{ status: String, userId: String }` | Connection status update |
| `joined_group` | `{ groupId: String, message: String }` | Confirmation of joining group |
| `left_group` | `{ groupId: String, message: String }` | Confirmation of leaving group |
| `user_online` | `{ groupId: String, userId: String }` | Notification when a user comes online in a group |
| `user_offline` | `{ groupId: String, userId: String }` | Notification when a user goes offline in a group |
| `pora_booked` | `{ bookingId: String, poraId: String, poraName: String, groupId: String, userId: String, userName: String, timestamp: Date }` | Notification when a pora is booked |
| `booking_confirmed` | `{ bookingId: String, poraId: String, poraName: String }` | Confirmation of your pora booking |
| `pora_completed` | `{ bookingId: String, poraId: String, poraName: String, groupId: String, groupName: String, userId: String, userName: String, totalFinished: Int, hatmCompleted: Bool, timestamp: Date }` | Notification when a pora is completed |
| `completion_confirmed` | `{ bookingId: String, poraId: String, poraName: String }` | Confirmation of your pora completion |
| `hatm_completed` | `{ groupId: String, groupName: String, hatmCount: Int, timestamp: Date }` | Notification when a Quran hatm is completed |
| `zikr_count_updated` | `{ groupId: String, zikrId: String, zikrName: String, userId: String, userName: String, count: Int, totalCount: Int, progress: String, goalReached: Bool, timestamp: Date }` | Update on zikr count changes |
| `zikr_update_confirmed` | `{ id: String, count: Int, totalCount: Int, goalReached: Bool }` | Confirmation of your zikr count update |
| `new_invitation` | `{ id: String, senderId: String, senderName: String, groupId: String, groupName: String, time: Date }` | Notification of new invitation |
| `new_notification` | `{ id: String, type: String, senderId: String, senderName: String, groupId: String, groupName: String, time: Date }` | Notification of new notification |
| `notifications` | Array of notification objects | List of unread notifications |
| `notification_marked_read` | `{ notificationId: String, success: Bool }` | Confirmation that a notification was marked as read |
| `invitation_sent` | `{ id: String, receiverId: String, groupId: String, time: Date }` | Confirmation that an invitation was sent |
| `invitation_accepted` | `{ notificationId: String, groupId: String, groupName: String, userId: String, userName: String }` | Notification that an invitation was accepted |
| `invitation_rejected` | `{ notificationId: String, groupId: String, groupName: String, userId: String }` | Notification that an invitation was rejected |
| `invitation_responded` | `{ notificationId: String, accepted: Bool, groupId: String, groupName: String }` | Confirmation of your invitation response |
| `member_joined` | `{ groupId: String, groupName: String, userId: String, userName: String, timestamp: Date }` | Notification when a new member joins the group |
| `member_left` | `{ groupId: String, userId: String, userName: String, timestamp: Date }` | Notification when a member leaves the group |
| `error` | `{ message: String, error?: String }` | Error message from server |

## Swift Usage Examples

### Connecting to WebSocket Server

```swift
// Initialize and connect
ZikrSocketManager.shared.connect(withToken: "your-jwt-token")

// Disconnect when done
ZikrSocketManager.shared.disconnect()