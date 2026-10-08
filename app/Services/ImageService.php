<?php


namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ImageService
{
    private ?Cloudinary $client = null;

    private function client(): Cloudinary
    {
        return $this->client ??= new Cloudinary([
            'cloud' => [
                'cloud_name' => config('services.cloudinary.cloud_name'),
                'api_key' => config('services.cloudinary.api_key'),
                'api_secret' => config('services.cloudinary.api_secret'),
            ],
            'url' => ['secure' => true],
        ]);
    }

    /**
     * Uploads an image and returns its Cloudinary public_id
     * (this is what we store in the products.image_path column).
     */
    public function upload(UploadedFile $file, string $folder = 'products'): string
    {
        try {
            $result = $this->client()->uploadApi()->upload($file->getRealPath(), [
                'folder' => $folder,
                'resource_type' => 'image',
            ]);

            return $result['public_id'];
        } catch (\Throwable $e) {
            Log::error('Cloudinary upload failed: ' . $e->getMessage());

            throw ValidationException::withMessages([
                'image' => 'Image upload failed. Please try again.',
            ]);
        }
    }

    /**
     * Deletes an image by public_id. Never throws, so a failed cleanup
     * can't break a product update or delete.
     */
    public function delete(?string $publicId): void
    {
        if (!$publicId) {
            return;
        }

        try {
            $this->client()->uploadApi()->destroy($publicId, [
                'resource_type' => 'image',
                'invalidate' => true,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Cloudinary delete failed for ' . $publicId . ': ' . $e->getMessage());
        }
    }

    /**
     * Builds the public delivery URL (auto format + auto quality).
     * Static so API resources can call it without creating a client.
     */
    public static function url(?string $publicId): ?string
    {
        if (!$publicId) {
            return null;
        }

        return sprintf(
            'https://res.cloudinary.com/%s/image/upload/f_auto,q_auto/%s',
            config('services.cloudinary.cloud_name'),
            $publicId
        );
    }
}
