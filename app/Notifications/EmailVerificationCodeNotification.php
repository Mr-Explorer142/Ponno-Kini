<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailVerificationCodeNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verify your PonnoKini email address')
            ->greeting('Welcome to PonnoKini!')
            ->line('Enter this code on the verification page to confirm your email address:')
            ->line($this->code)
            ->line('This code expires in 10 minutes. If you did not create an account, you can ignore this email.');
    }
}
