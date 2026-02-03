import { platformServer } from '@angular/platform-server';
import { AppModule } from './app/app.module';

const bootstrap = () => platformServer().bootstrapModule(AppModule);

export default bootstrap;
