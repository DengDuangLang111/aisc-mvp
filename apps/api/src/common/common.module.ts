import { Module, Global } from '@nestjs/common';
import { GoogleCredentialsProvider } from './providers/google-credentials.provider';

@Global()
@Module({
  providers: [GoogleCredentialsProvider],
  exports: [GoogleCredentialsProvider],
})
export class CommonModule {}
