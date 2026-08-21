import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(ptBr, 'pt-BR');

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
