-- CreateIndex
CREATE INDEX "UserProfile_isActive_status_allowDiscovery_idx" ON "UserProfile"("isActive", "status", "allowDiscovery");
