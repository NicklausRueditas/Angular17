import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SesionService } from '../../../core/services/sesion.service';
import { Router } from '@angular/router';
import { User } from '../../../core/interfaces/user.interface';
import { firstValueFrom } from 'rxjs';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.css',
})
export class MyAccountComponent implements OnInit {
  userData: Partial<User> | null = null;
  userForm!: FormGroup;
  selectedTab: string = 'perfil'; // 📌 Tab activa por defecto

  constructor(
    private fb: FormBuilder,
    private sesionService: SesionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  /** 📌 Inicializa el formulario con validaciones */
  private initForm() {
    this.userForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dni: [''],
      addresses: this.fb.array([]), // 📌 Arreglo de direcciones (ObjectId)
      cards: this.fb.array([]), // 📌 Arreglo de tarjetas (ObjectId)
    });
  }

  /** 🔄 Obtiene el perfil del usuario al iniciar */
  async ngOnInit() {
    try {
      this.userData = await firstValueFrom(this.sesionService.getUserProfile());
      if (this.userData) {
        this.populateForm();
      }
    } catch (error) {
      console.error('❌ Error al cargar el perfil del usuario:', error);
    }
  }

  /** 📌 Rellena el formulario con los datos del usuario */
  private populateForm() {
    this.userForm.patchValue({
      displayName: this.userData?.displayName || '',
      email: this.userData?.email || '',
      dni: this.userData?.dni || '',
      phone: this.userData?.phone|| '',
    });

    this.cdr.detectChanges(); // 🔄 Forzar actualización de la vista
  }

  /** 📌 Agrega valores a un FormArray */
  private setFormArray(field: string, values: string[]) {
    const formArray = this.userForm.get(field) as FormArray;
    formArray.clear(); // 🔄 Limpia el array antes de agregar nuevos valores

    values.forEach((value) =>
      formArray.push(this.fb.control(value, [Validators.required]))
    );
  }

  /** 🔄 Cambia la pestaña activa */
  setTab(tab: string) {
    this.selectedTab = tab;
  }
}
