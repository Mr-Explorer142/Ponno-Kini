<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class StorefrontNotification extends Notification
{
    public function __construct(
        public string $eventType,
        public string $message,
        public string $url,
        public array $metadata = [],
    ) {}

    /**
     * Get the delivery channels for the notification.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->eventType,
            'message' => $this->message,
            'url' => $this->url,
            ...$this->metadata,
        ];
    }
}
