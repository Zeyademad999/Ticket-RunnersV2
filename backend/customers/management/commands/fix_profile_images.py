"""
Django management command to fix profile images for existing accounts.

This command:
1. Finds all customers with profile images
2. Ensures their profile_image files exist and are accessible
3. Re-saves the profile_image to ensure proper file paths
4. Reports any issues found

Usage:
    python manage.py fix_profile_images
    python manage.py fix_profile_images --dry-run  # Preview changes without saving
    python manage.py fix_profile_images --customer-id 13  # Fix specific customer
"""

from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from customers.models import Customer
import os
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix profile images for existing customer accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without actually saving them',
        )
        parser.add_argument(
            '--customer-id',
            type=int,
            help='Fix profile image for a specific customer ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Process all customers, even those without profile images',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        customer_id = options.get('customer_id')
        process_all = options.get('all', False)

        self.stdout.write(self.style.SUCCESS('Starting profile image fix...'))
        
        # First, check for any temporary profile images that need to be moved
        if not dry_run:
            self.stdout.write('Checking for temporary profile images...')
            temp_images_found = self._check_temp_images()
            if temp_images_found:
                self.stdout.write(
                    self.style.WARNING(
                        f'Found {temp_images_found} temporary profile image(s) in storage. '
                        'These may need manual cleanup.'
                    )
                )
        
        if customer_id:
            customers = Customer.objects.filter(id=customer_id)
            if not customers.exists():
                self.stdout.write(self.style.ERROR(f'Customer with ID {customer_id} not found'))
                return
        else:
            if process_all:
                customers = Customer.objects.all()
            else:
                # Only process customers with profile images
                customers = Customer.objects.exclude(profile_image='').exclude(profile_image__isnull=True)
        
        total = customers.count()
        fixed = 0
        errors = 0
        skipped = 0

        self.stdout.write(f'Found {total} customer(s) to process')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        for customer in customers:
            try:
                self.stdout.write(f'\nProcessing Customer {customer.id} ({customer.email})...')
                
                # Check if profile_image field has a value
                if not customer.profile_image:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠ No profile image set for customer {customer.id}'
                        )
                    )
                    
                    # Check for temporary profile images that might belong to this customer
                    if customer.mobile_number:
                        self.stdout.write(f'  Checking for temporary images for mobile: {customer.mobile_number}...')
                        temp_image_found = self._find_and_move_temp_image(customer, dry_run)
                        if temp_image_found:
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'  ✓ Found and moved temporary profile image!'
                                )
                            )
                            fixed += 1
                            continue
                    
                    skipped += 1
                    continue

                # Check if file exists
                file_path = customer.profile_image.name if hasattr(customer.profile_image, 'name') else str(customer.profile_image)
                self.stdout.write(f'  Profile image path: {file_path}')
                
                # Check if file exists in storage
                file_exists = default_storage.exists(file_path) if file_path else False
                
                if not file_exists:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  ✗ Profile image file NOT FOUND at: {file_path}'
                        )
                    )
                    # Try to find the file in different locations
                    self.stdout.write('  Searching for file in alternative locations...')
                    
                    # Check if it's in temp_profile_images
                    temp_path = f'temp_profile_images/{customer.mobile_number}_*'
                    # Can't use glob with default_storage easily, so just try common patterns
                    if customer.mobile_number:
                        possible_paths = [
                            f'temp_profile_images/{customer.mobile_number}_*.jpg',
                            f'temp_profile_images/{customer.mobile_number}_*.png',
                            f'temp_profile_images/{customer.mobile_number}_*.jpeg',
                        ]
                        # For now, just report the issue
                        self.stdout.write(
                            self.style.WARNING(
                                f'  File not found. Customer may need to re-upload their profile image.'
                            )
                        )
                    
                    errors += 1
                    continue

                # File exists - get details
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Profile image file EXISTS at: {file_path}')
                )
                
                try:
                    # Get file size
                    file_size = default_storage.size(file_path)
                    self.stdout.write(f'  File size: {file_size} bytes')
                    
                    # Get the file URL
                    file_url = customer.profile_image.url
                    self.stdout.write(f'  File URL: {file_url}')
                    
                    # Re-save the profile image to ensure proper path and refresh the model
                    if not dry_run:
                        # Open the existing file
                        with default_storage.open(file_path, 'rb') as f:
                            file_content = f.read()
                            # Get the original filename
                            original_filename = os.path.basename(file_path)
                            # Re-save with the same name to ensure proper path
                            customer.profile_image.save(
                                original_filename,
                                ContentFile(file_content),
                                save=True
                            )
                        # Refresh from database to ensure we have the latest
                        customer.refresh_from_db()
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  ✓✓ FIXED: Profile image re-saved for customer {customer.id}'
                            )
                        )
                        self.stdout.write(f'  New path: {customer.profile_image.name}')
                        self.stdout.write(f'  New URL: {customer.profile_image.url}')
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  [DRY RUN] Would re-save profile image for customer {customer.id}'
                            )
                        )
                    
                    fixed += 1
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  ✗ Error processing profile image: {str(e)}'
                        )
                    )
                    logger.exception(f'Error processing customer {customer.id} profile image')
                    errors += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ Error processing customer {customer.id}: {str(e)}'
                    )
                )
                errors += 1
                logger.exception(f'Error processing customer {customer.id}')

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('Summary:'))
        self.stdout.write(f'  Total customers processed: {total}')
        self.stdout.write(self.style.SUCCESS(f'  Fixed: {fixed}'))
        if skipped > 0:
            self.stdout.write(self.style.WARNING(f'  Skipped: {skipped}'))
        if errors > 0:
            self.stdout.write(self.style.ERROR(f'  Errors: {errors}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a DRY RUN. No changes were saved.'))
            self.stdout.write('Run without --dry-run to apply changes.')
    
    def _check_temp_images(self):
        """Check for temporary profile images in storage."""
        try:
            # Check for temp_profile_images directory
            temp_dir = 'temp_profile_images'
            if default_storage.exists(temp_dir):
                # List files in temp directory
                files = default_storage.listdir(temp_dir)[1]  # Get files (second element)
                return len(files)
        except Exception as e:
            logger.warning(f'Error checking temp images: {str(e)}')
        return 0
    
    def _find_and_move_temp_image(self, customer, dry_run=False):
        """Find temporary profile image for customer and move it to their profile."""
        try:
            if not customer.mobile_number:
                return False
            
            temp_dir = 'temp_profile_images'
            if not default_storage.exists(temp_dir):
                return False
            
            # List all files in temp directory
            try:
                dirs, files = default_storage.listdir(temp_dir)
            except Exception:
                return False
            
            # Look for files that start with the mobile number
            mobile_prefix = f'{customer.mobile_number}_'
            matching_files = [f for f in files if f.startswith(mobile_prefix)]
            
            if not matching_files:
                self.stdout.write(f'    No temporary images found starting with {mobile_prefix}')
                return False
            
            # Use the first matching file
            temp_filename = matching_files[0]
            temp_path = f'{temp_dir}/{temp_filename}'
            
            self.stdout.write(f'    Found temporary image: {temp_path}')
            
            if not dry_run:
                # Open the temporary file
                with default_storage.open(temp_path, 'rb') as temp_file:
                    file_content = temp_file.read()
                    # Save to customer's profile_image field
                    customer.profile_image.save(
                        temp_filename.replace(f'{customer.mobile_number}_', ''),
                        ContentFile(file_content),
                        save=True
                    )
                
                # Delete the temporary file
                try:
                    default_storage.delete(temp_path)
                    self.stdout.write(f'    Deleted temporary file: {temp_path}')
                except Exception as e:
                    logger.warning(f'Could not delete temp file {temp_path}: {str(e)}')
                
                # Refresh customer from DB
                customer.refresh_from_db()
                self.stdout.write(f'    Profile image saved to: {customer.profile_image.name}')
                return True
            else:
                self.stdout.write(f'    [DRY RUN] Would move {temp_path} to customer profile')
                return True
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'    Error finding/moving temp image: {str(e)}')
            )
            logger.exception(f'Error finding temp image for customer {customer.id}')
            return False

