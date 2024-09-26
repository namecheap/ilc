export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
    };
}
