import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  showSuccess(msg: string) {
    console.log('[SUCCESS]', msg);
  }

  showError(msg: string) {
    console.error('[ERROR]', msg);
  }

  showInfo(msg: string) {
    console.log('[INFO]', msg);
  }
}
