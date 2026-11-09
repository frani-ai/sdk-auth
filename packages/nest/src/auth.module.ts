import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BIFROST_AUTH_OPTIONS } from './constants.js';
import { AuthGuard } from './guards/auth.guard.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { RoleGuard } from './guards/role.guard.js';
import type {
  BifrostAuthModuleAsyncOptions,
  BifrostAuthModuleOptions,
  BifrostAuthOptionsFactory,
} from './interfaces.js';

export interface BifrostAuthRegisterOptions extends BifrostAuthModuleOptions {
  /** Register AuthGuard + PermissionGuard + RoleGuard as global APP_GUARD (default true). */
  globalGuards?: boolean;
}

@Module({})
export class BifrostAuthModule {
  static register(options: BifrostAuthRegisterOptions): DynamicModule {
    const { globalGuards = true, ...authOptions } = options;
    return {
      module: BifrostAuthModule,
      providers: [
        { provide: BIFROST_AUTH_OPTIONS, useValue: authOptions },
        AuthGuard,
        PermissionGuard,
        RoleGuard,
        ...this.globalGuardProviders(globalGuards),
      ],
      exports: [BIFROST_AUTH_OPTIONS, AuthGuard, PermissionGuard, RoleGuard],
    };
  }

  static registerAsync(
    options: BifrostAuthModuleAsyncOptions & { globalGuards?: boolean },
  ): DynamicModule {
    const { globalGuards = true, ...asyncOpts } = options;
    return {
      module: BifrostAuthModule,
      imports: (asyncOpts.imports as DynamicModule['imports']) ?? [],
      providers: [
        ...this.createAsyncProviders(asyncOpts),
        AuthGuard,
        PermissionGuard,
        RoleGuard,
        ...this.globalGuardProviders(globalGuards),
      ],
      exports: [BIFROST_AUTH_OPTIONS, AuthGuard, PermissionGuard, RoleGuard],
    };
  }

  private static globalGuardProviders(enabled: boolean): Provider[] {
    if (!enabled) return [];
    return [
      { provide: APP_GUARD, useClass: AuthGuard },
      { provide: APP_GUARD, useClass: PermissionGuard },
      { provide: APP_GUARD, useClass: RoleGuard },
    ];
  }

  private static createAsyncProviders(options: BifrostAuthModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: BIFROST_AUTH_OPTIONS,
          useFactory: options.useFactory,
          inject: (options.inject as never[]) ?? [],
        },
      ];
    }

    const useClass = (options.useClass ?? options.useExisting) as
      | Type<BifrostAuthOptionsFactory>
      | undefined;
    if (!useClass) {
      throw new Error('BifrostAuthModule.registerAsync requer useFactory, useClass ou useExisting');
    }

    const providers: Provider[] = [
      {
        provide: BIFROST_AUTH_OPTIONS,
        useFactory: async (factory: BifrostAuthOptionsFactory) =>
          factory.createBifrostAuthOptions(),
        inject: [useClass],
      },
    ];
    if (options.useClass) {
      providers.push({ provide: useClass, useClass: options.useClass });
    }
    return providers;
  }
}
