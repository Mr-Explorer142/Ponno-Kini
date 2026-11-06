<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentSuccessfulNotification extends Notification
{
    protected Order $order;

    /**
     * Create a new notification instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Payment Received - Order #" . $this->order->order_number)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('We have successfully received your payment of ৳' . $this->order->total_amount . '.')
            ->line('Your order is now processing.')
            ->action('View Orders', rtrim(config('app.frontend_url'), '/').'/orders')
            ->line('Thank you for shopping with us!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payment.succeeded',
            'order_id' => $this->order->id,
            'message' => 'Payment successful for Order #' . $this->order->order_number,
            'url' => '/orders',
            'amount' => $this->order->total_amount,
        ];
    }
}
