import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_ROUTE = 'isAdminRoute';
/** Mark a controller or handler as admin-only. */
export const Admin = () => SetMetadata(IS_ADMIN_ROUTE, true);
