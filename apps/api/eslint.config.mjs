import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'generated/**',
      'coverage/**',
      'src/auth/strategies/**',
      'src/auth/rate-limit/**',
      'src/auth/token.service.ts',
      'src/auth/password.service.ts',
      'src/auth/auth.constants.ts',
      'src/auth/auth-session.service.ts',
      'src/auth/auth-session.controller.ts',
      'src/auth/dto/**',
      'src/rbac/**',
      'src/users/user.mapper.ts',
      '**/user.mapper.ts',
      'src/users/dto/**',
      'src/users/users-admin.service.ts',
      'src/users/users-admin.controller.ts',
      'src/tenants/admin-tenants.controller.ts',
      'src/tenants/provision-tenant.ts',
      'src/tenants/bootstrap.guard.ts',
      'src/tenants/dto/**',
      'src/prisma/client.ts',
      'src/common/http/success.interceptor.ts',
      'src/common/time/**',
      'src/common/crypto/**',
      'src/common/guards/permissions.guard.ts',
      'src/common/guards/jwt-auth.guard.ts',
      'src/common/context/**',
      'src/common/decorators/require-permissions.decorator.ts',
      'src/common/decorators/current-user.decorator.ts',
      'src/common/decorators/public.decorator.ts',
      'src/audit/audit-actions.ts',
      'src/prisma/tenant-extension.ts',
      'src/backups/**',
      'src/phase2/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
