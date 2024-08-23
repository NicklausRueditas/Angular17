export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface User {
    googleId?: string;
    displayName: string;
    email: string;
    profilePicture?: string;
    roles: string[];
  }
  
  export interface LoginResponse {
    token: string;
    user: User;
  }