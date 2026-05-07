export class UpdateCatalogVisibilityDto {
  isVisibleToUsers!: boolean;
}

export class BulkUpdateCatalogDto {
  ids!: string[];
  isVisibleToUsers!: boolean;
}
