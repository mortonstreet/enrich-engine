import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Timestamp | null;
    refreshTokenExpiresAt: Timestamp | null;
    scope: string | null;
    password: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type BulkEnrichmentItem = {
    id: string;
    jobId: string;
    identifier: string;
    linkedinUrl: string;
    status: string;
    email: string | null;
    mobile: string | null;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    companyName: string | null;
    errorCode: string | null;
    rawResponse: unknown | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type BulkEnrichmentJob = {
    id: string;
    organizationId: string;
    userId: string;
    status: string;
    totalRecords: number;
    processedRecords: Generated<number>;
    matchedRecords: Generated<number>;
    failedRecords: Generated<number>;
    originalFileName: string;
    totalCreditsCost: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    completedAt: Timestamp | null;
};
export type CreditTransaction = {
    id: string;
    organizationId: string;
    paymentInvoiceId: string;
    amount: number;
    type: string;
    metadata: unknown;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Enrichment = {
    id: string;
    organizationId: string;
    userId: string;
    linkedinUrl: string;
    status: string;
    enrichMobile: Generated<boolean>;
    email: string | null;
    emailVerified: boolean | null;
    mobile: string | null;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    companyName: string | null;
    companyDomain: string | null;
    rawResponse: unknown | null;
    errorCode: string | null;
    creditsCost: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    completedAt: Timestamp | null;
};
export type Example = {
    id: string;
    name: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Invitation = {
    id: string;
    organizationId: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Timestamp;
    createdAt: Timestamp;
    inviterId: string;
};
export type Member = {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Timestamp;
};
export type Notification = {
    id: string;
    userId: string;
    title: string;
    message: string;
    link: string | null;
    readAt: Timestamp | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Organization = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Timestamp;
    metadata: string | null;
};
export type Session = {
    id: string;
    expiresAt: Timestamp;
    token: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
    activeOrganizationId: string | null;
    impersonatedBy: string | null;
};
export type Subscription = {
    id: string;
    plan: string;
    referenceId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    status: Generated<string | null>;
    periodStart: Timestamp | null;
    periodEnd: Timestamp | null;
    trialStart: Timestamp | null;
    trialEnd: Timestamp | null;
    cancelAtPeriodEnd: Generated<boolean | null>;
    seats: number | null;
};
export type User = {
    id: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
    email: string;
    emailVerified: Generated<boolean>;
    name: string | null;
    image: string | null;
    stripeCustomerId: string | null;
    lastActiveOrganizationId: string | null;
    role: string | null;
    banned: Generated<boolean | null>;
    banReason: string | null;
    banExpires: Timestamp | null;
};
export type Verification = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Timestamp;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Waitlist = {
    id: string;
    email: string;
    source: string | null;
    createdAt: Generated<Timestamp>;
};
export type DB = {
    account: Account;
    bulk_enrichment_item: BulkEnrichmentItem;
    bulk_enrichment_job: BulkEnrichmentJob;
    credit_transaction: CreditTransaction;
    enrichment: Enrichment;
    example: Example;
    invitation: Invitation;
    member: Member;
    notification: Notification;
    organization: Organization;
    session: Session;
    subscription: Subscription;
    user: User;
    verification: Verification;
    waitlist: Waitlist;
};
