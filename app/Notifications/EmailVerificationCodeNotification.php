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
            ->subject('Your PonnoKini verification code')
            ->greeting('Hello!')
            ->line('Use this code to verify your email address or confirm your account change:')
            ->line($this->code)
            ->line('This code expires in 10 minutes. If you did not create an account, you can ignore this email.');
    }
}
