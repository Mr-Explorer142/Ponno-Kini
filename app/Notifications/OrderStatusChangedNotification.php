<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderStatusChangedNotification extends Notification
{
    public function __construct(private readonly Order $order) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Order status updated - Order #{$this->order->order_number}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your order status is now {$this->order->status}.")
            ->action('View Order', rtrim(config('app.frontend_url'), '/').'/orders')
            ->line('Thank you for shopping with us!');
    }
}
