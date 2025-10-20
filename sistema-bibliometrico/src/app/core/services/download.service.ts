import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DownloadService { // ✅ Se exporta la clase directamente
  private downloadCompleteSource = new Subject<void>();

  downloadComplete$ = this.downloadCompleteSource.asObservable();

  notifyComplete(): void { this.downloadCompleteSource.next(); }
}