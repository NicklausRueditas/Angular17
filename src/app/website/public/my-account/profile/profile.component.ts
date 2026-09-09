import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { User } from '../../../../core/interfaces/user.interface';
import { SesionService } from '../../../../core/services/auth/sesion.service';
import { ImageService } from '../../../../core/services/utils/image.service';
import { ToastService } from '../../../../core/services/ui/toast.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastComponent, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  userData: Partial<User> | null = null;
  userForm!: FormGroup;

  // Estados de carga y feedback
  isLoading = true;
  isSubmitting = false;
  isUploadingAvatar = false;
  imageError = false;

  constructor(
    private fb: FormBuilder,
    private sesionService: SesionService,
    private imageService: ImageService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  /** Inicializa el formulario reactivo */
  private initForm(): void {
    this.userForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }],
      dni: ['', [Validators.pattern(/^\d{8}$/)]],
      phone: ['', [Validators.pattern(/^\+?\d{9,15}$/)]]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUserProfile();
  }

  /** Carga la información completa del perfil del usuario */
  async loadUserProfile(): Promise<void> {
    this.isLoading = true;
    try {
      this.userData = await firstValueFrom(this.sesionService.getProfile());
      if (this.userData) {
        this.populateForm();
      }
    } catch (error) {
      console.error('❌ Error al cargar perfil:', error);
      this.toastService.showError('No se pudo cargar la información del perfil');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /** Rellena el formulario con los datos cargados */
  private populateForm(): void {
    if (!this.userData) return;

    this.userForm.patchValue({
      displayName: this.userData.displayName || '',
      email: this.userData.email || '',
      dni: this.userData.dni || '',
      phone: this.userData.phone || ''
    });

    this.userForm.markAsPristine();
    this.imageError = false;
    this.cdr.detectChanges();
  }

  /** Porcentaje dinámico de completitud del perfil */
  get profileCompletion(): { percent: number; pendingFields: string[] } {
    if (!this.userData) return { percent: 25, pendingFields: [] };

    let completed = 0;
    const pending: string[] = [];

    // Email (siempre presente para estar registrado)
    if (this.userData.email) completed += 25;

    // Nombre completo
    if (this.userForm.get('displayName')?.value?.trim()) {
      completed += 25;
    } else {
      pending.push('Nombre');
    }

    // Teléfono
    if (this.userForm.get('phone')?.value?.trim()) {
      completed += 25;
    } else {
      pending.push('Teléfono');
    }

    // DNI / Documento o Foto
    if (this.userForm.get('dni')?.value?.trim() || this.userData.profilePicture) {
      completed += 25;
    } else {
      pending.push('DNI / Foto');
    }

    return { percent: completed, pendingFields: pending };
  }

  /** Rol principal legible para el badge */
  get primaryRoleLabel(): string {
    const roles = this.userData?.roles || [];
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('seller')) return 'Vendedor Oficial';
    if (roles.includes('worker')) return 'Personal Moorea';
    return 'Cliente Verificado';
  }

  /** Abre el selector nativo de archivos */
  triggerFileInput(): void {
    if (this.isUploadingAvatar) return;
    this.fileInputRef?.nativeElement.click();
  }

  /** Manejo de selección y subida del avatar a Cloudinary */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validación de tipo
    if (!file.type.startsWith('image/')) {
      this.toastService.showError('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP)');
      input.value = '';
      return;
    }

    // Validación de tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.showError('La imagen no puede superar los 5 MB');
      input.value = '';
      return;
    }

    this.isUploadingAvatar = true;
    this.cdr.detectChanges();

    try {
      // 1. Subir imagen a Cloudinary mediante ImageService
      const uploadRes = await firstValueFrom(this.imageService.uploadImage(file));
      const newImageUrl = uploadRes.secureUrl || uploadRes.cloudinaryUrl;

      // 2. Guardar la nueva URL en el perfil de usuario del backend
      const updatedUser = await firstValueFrom(
        this.sesionService.updateProfile({ profilePicture: newImageUrl })
      );

      this.userData = updatedUser;
      this.imageError = false;
      this.toastService.showSuccess('¡Foto de perfil actualizada con éxito!');
    } catch (error) {
      console.error('❌ Error al subir avatar:', error);
      this.toastService.showError('No se pudo subir la foto de perfil. Inténtalo de nuevo.');
    } finally {
      this.isUploadingAvatar = false;
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  /** Elimina la foto de perfil personalizada */
  async removePhoto(): Promise<void> {
    if (!this.userData?.profilePicture) return;

    this.isUploadingAvatar = true;
    try {
      const updatedUser = await firstValueFrom(
        this.sesionService.updateProfile({ profilePicture: '' })
      );
      this.userData = updatedUser;
      this.toastService.showSuccess('Foto de perfil eliminada');
    } catch (error) {
      console.error('❌ Error al eliminar foto:', error);
      this.toastService.showError('No se pudo eliminar la foto');
    } finally {
      this.isUploadingAvatar = false;
      this.cdr.detectChanges();
    }
  }

  onImageError(): void {
    this.imageError = true;
  }

  /** Restablece los cambios del formulario a los valores originales */
  resetForm(): void {
    this.populateForm();
    this.toastService.showInfo('Cambios descartados');
  }

  /** Envío del formulario y actualización en el backend */
  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastService.showError('Por favor revisa los campos señalados en rojo');
      return;
    }

    if (!this.userForm.dirty) {
      this.toastService.showInfo('No hay cambios pendientes para guardar');
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const formValues = this.userForm.getRawValue();
    const updatePayload: Partial<User> = {
      displayName: formValues.displayName.trim(),
      phone: formValues.phone ? formValues.phone.trim() : '',
      dni: formValues.dni ? formValues.dni.trim() : ''
    };

    try {
      const updatedUser = await firstValueFrom(
        this.sesionService.updateProfile(updatePayload)
      );

      this.userData = updatedUser;
      this.populateForm();
      this.toastService.showSuccess('¡Perfil actualizado con éxito!');
    } catch (error: any) {
      console.error('❌ Error al actualizar perfil:', error);
      const msg = error?.error?.message || 'No se pudieron guardar los cambios en tu perfil';
      this.toastService.showError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
}
