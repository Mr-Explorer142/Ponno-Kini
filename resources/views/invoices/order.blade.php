<!DOCTYPE html>
<html lang="en">
<head>
    <!-- CRITICAL: Enforces UTF-8 encoding for DomPDF -->
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        /* General Body Styles */
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 14px; }
        .w-100 { width: 100%; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .border-bottom { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { margin: 0; color: #2563eb; }

        /* Data Tables */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 30px; margin-bottom: 30px; }
        .items-table th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; }
        .items-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .total-row td { font-weight: bold; font-size: 1.1em; border-top: 2px solid #333; }

        /* Badges */
        .status { padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .paid { background: #dcfce7; color: #166534; }
        .pending { background: #fef08a; color: #854d0e; }
    </style>
</head>
<body>

<!-- Header Section -->
<table class="w-100 border-bottom">
    <tr>
        <td class="text-left" style="width: 50%; vertical-align: top;">
            <h1>PonnoKini</h1>
            <p>123 Business Avenue<br>Dhaka, Bangladesh</p>
        </td>
        <td class="text-right" style="width: 50%; vertical-align: top;">
            <h2 style="margin: 0 0 5px 0;">INVOICE</h2>
            <p style="margin: 0;"><strong>Order #:</strong> {{ $order->order_number }}<br>
                <strong>Date:</strong> {{ $order->created_at->format('F d, Y') }}</p>
            <br>
            <span class="status {{ $order->payment_status === 'paid' ? 'paid' : 'pending' }}">
                    Payment: {{ strtoupper($order->payment_status) }}
                </span>
        </td>
    </tr>
</table>

<!-- Billing Details -->
<table class="w-100">
    <tr>
        <td class="text-left" style="width: 50%; vertical-align: top;">
            <h3>Billed To:</h3>
            <p><strong>{{ $order->user->name }}</strong><br>
                {{ $order->user->email }}</p>
        </td>
        <td class="text-right" style="width: 50%; vertical-align: top;">
            <h3>Shipped To:</h3>
            <p>
                {{ $order->shipping_address['street'] ?? '' }}<br>
                {{ $order->shipping_address['city'] ?? '' }} {{ $order->shipping_address['postal_code'] ?? '' }}<br>
                {{ $order->shipping_address['country'] ?? '' }}<br>
                Phone: {{ $order->shipping_address['phone'] ?? '' }}
            </p>
        </td>
    </tr>
</table>

<!-- Line Items -->
<table class="items-table">
    <thead>
    <tr>
        <th>Item</th>
        <th>Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Subtotal</th>
    </tr>
    </thead>
    <tbody>
    @foreach($order->items as $item)
        <tr>
            <td>{{ $item->product->name }}</td>
            <td>{{ $item->quantity }}</td>
            <td class="text-right">BDT {{ number_format($item->unit_price, 2) }}</td>
            <td class="text-right">BDT {{ number_format($item->subtotal, 2) }}</td>
        </tr>
    @endforeach
    <tr class="total-row">
        <td colspan="3" class="text-right">Total Amount</td>
        <td class="text-right">BDT {{ number_format($order->total_amount, 2) }}</td>
    </tr>
    </tbody>
</table>

<p style="text-align: center; color: #64748b; margin-top: 40px; font-size: 12px;">
    Thank you for your business! If you have any questions about this invoice, please contact support.
</p>

</body>
</html>
