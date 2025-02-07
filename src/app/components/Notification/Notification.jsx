'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = ({ notifications, onClose }) => {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50">
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              href={`/profile/${notification.fromUserId}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
              onClick={onClose}
            >
              <Image
                src={notification.fromUserAvatar || '/img/profile.png'}
                width={40}
                height={40}
                alt="Profile"
                className="rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{notification.fromUsername}</span>
                  {' started following you'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Set up real-time updates if needed
  }, []);

  const handleClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAsRead();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="relative p-2 hover:bg-gray-700 rounded-full transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <NotificationDropdown
            notifications={notifications}
            onClose={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default NotificationBell;