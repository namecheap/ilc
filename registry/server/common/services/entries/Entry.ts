export interface Entry {
    patch(entity: unknown, { user }: { user: any }): Promise<any>,
    create(entity: unknown, { user }: { user: any }): Promise<any>,
}
