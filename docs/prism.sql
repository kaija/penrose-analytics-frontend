--
-- PostgreSQL database dump
--

\restrict s9YcI9DTqzizu3ekDqEcRCd4HltEHCJMGpccjc79tFgDyZRAqgxwbJz0pR3Hjdk

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12 (Debian 16.12-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'owner',
    'admin',
    'editor',
    'viewer'
);


--
-- Name: UserSchemaType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserSchemaType" AS ENUM (
    'aggregate',
    'formula'
);


--
-- Name: cleanup_expired_id_mappings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_id_mappings() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM "IdMapping"
    WHERE "expiresAt" IS NOT NULL
    AND "expiresAt" < NOW();
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "projectId" text,
    "userId" text NOT NULL,
    action text NOT NULL,
    details jsonb NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Dashboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Dashboard" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Event" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "profileId" text NOT NULL,
    "eventName" text NOT NULL,
    payload jsonb NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EventSchema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EventSchema" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "eventName" text NOT NULL,
    "displayName" text NOT NULL,
    icon text,
    properties jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: IdHierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IdHierarchy" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "displayName" text NOT NULL,
    "codeName" text NOT NULL,
    priority integer NOT NULL,
    "isCustom" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: IdMapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IdMapping" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "idType" text NOT NULL,
    "idValue" text NOT NULL,
    "profileId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: TABLE "IdMapping"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."IdMapping" IS 'High-performance ID mapping table for resolving various ID types (email, idfa, session, cookie) to profile IDs';


--
-- Name: COLUMN "IdMapping"."idType"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."IdMapping"."idType" IS 'Type of identifier (e.g., email, idfa, session, cookie, device_id)';


--
-- Name: COLUMN "IdMapping"."idValue"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."IdMapping"."idValue" IS 'The actual identifier value';


--
-- Name: COLUMN "IdMapping"."profileId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."IdMapping"."profileId" IS 'The unified profile ID this identifier maps to';


--
-- Name: COLUMN "IdMapping"."expiresAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."IdMapping"."expiresAt" IS 'Optional expiration timestamp for temporary IDs like sessions and cookies';


--
-- Name: Invitation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invitation" (
    id text NOT NULL,
    token text NOT NULL,
    "projectId" text NOT NULL,
    "invitedEmail" text NOT NULL,
    role public."Role" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Profile" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "externalId" text NOT NULL,
    traits jsonb NOT NULL,
    identities jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProjectMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectMembership" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "projectId" text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Report" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    config jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Segment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Segment" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    description text,
    "filterConfig" jsonb NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    avatar text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserSchema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSchema" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    field text NOT NULL,
    "displayName" text NOT NULL,
    description text,
    "schemaType" public."UserSchemaType" NOT NULL,
    "aggregateConfig" jsonb,
    formula text,
    "dataType" text NOT NULL,
    format text,
    icon text,
    category text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Widget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Widget" (
    id text NOT NULL,
    "dashboardId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    config jsonb NOT NULL,
    "position" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Dashboard Dashboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dashboard"
    ADD CONSTRAINT "Dashboard_pkey" PRIMARY KEY (id);


--
-- Name: EventSchema EventSchema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventSchema"
    ADD CONSTRAINT "EventSchema_pkey" PRIMARY KEY (id);


--
-- Name: Event Event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_pkey" PRIMARY KEY (id);


--
-- Name: IdHierarchy IdHierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IdHierarchy"
    ADD CONSTRAINT "IdHierarchy_pkey" PRIMARY KEY (id);


--
-- Name: IdMapping IdMapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IdMapping"
    ADD CONSTRAINT "IdMapping_pkey" PRIMARY KEY (id);


--
-- Name: Invitation Invitation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_pkey" PRIMARY KEY (id);


--
-- Name: Profile Profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_pkey" PRIMARY KEY (id);


--
-- Name: ProjectMembership ProjectMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectMembership"
    ADD CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: Segment Segment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Segment"
    ADD CONSTRAINT "Segment_pkey" PRIMARY KEY (id);


--
-- Name: UserSchema UserSchema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSchema"
    ADD CONSTRAINT "UserSchema_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Widget Widget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Widget"
    ADD CONSTRAINT "Widget_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_projectId_idx" ON public."AuditLog" USING btree ("projectId");


--
-- Name: AuditLog_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_timestamp_idx" ON public."AuditLog" USING btree ("timestamp");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Dashboard_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Dashboard_projectId_idx" ON public."Dashboard" USING btree ("projectId");


--
-- Name: EventSchema_projectId_eventName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EventSchema_projectId_eventName_key" ON public."EventSchema" USING btree ("projectId", "eventName");


--
-- Name: EventSchema_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventSchema_projectId_idx" ON public."EventSchema" USING btree ("projectId");


--
-- Name: Event_eventName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Event_eventName_idx" ON public."Event" USING btree ("eventName");


--
-- Name: Event_profileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Event_profileId_idx" ON public."Event" USING btree ("profileId");


--
-- Name: Event_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Event_projectId_idx" ON public."Event" USING btree ("projectId");


--
-- Name: Event_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Event_timestamp_idx" ON public."Event" USING btree ("timestamp");


--
-- Name: IdHierarchy_projectId_codeName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IdHierarchy_projectId_codeName_key" ON public."IdHierarchy" USING btree ("projectId", "codeName");


--
-- Name: IdHierarchy_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IdHierarchy_projectId_idx" ON public."IdHierarchy" USING btree ("projectId");


--
-- Name: IdMapping_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IdMapping_expiresAt_idx" ON public."IdMapping" USING btree ("expiresAt") WHERE ("expiresAt" IS NOT NULL);


--
-- Name: IdMapping_profileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IdMapping_profileId_idx" ON public."IdMapping" USING btree ("profileId");


--
-- Name: IdMapping_projectId_idType_idValue_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IdMapping_projectId_idType_idValue_key" ON public."IdMapping" USING btree ("projectId", "idType", "idValue");


--
-- Name: IdMapping_projectId_idType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IdMapping_projectId_idType_idx" ON public."IdMapping" USING btree ("projectId", "idType");


--
-- Name: Invitation_invitedEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invitation_invitedEmail_idx" ON public."Invitation" USING btree ("invitedEmail");


--
-- Name: Invitation_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invitation_projectId_idx" ON public."Invitation" USING btree ("projectId");


--
-- Name: Invitation_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invitation_token_idx" ON public."Invitation" USING btree (token);


--
-- Name: Invitation_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invitation_token_key" ON public."Invitation" USING btree (token);


--
-- Name: Profile_externalId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_externalId_idx" ON public."Profile" USING btree ("externalId");


--
-- Name: Profile_projectId_externalId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Profile_projectId_externalId_key" ON public."Profile" USING btree ("projectId", "externalId");


--
-- Name: Profile_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_projectId_idx" ON public."Profile" USING btree ("projectId");


--
-- Name: ProjectMembership_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectMembership_projectId_idx" ON public."ProjectMembership" USING btree ("projectId");


--
-- Name: ProjectMembership_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectMembership_userId_idx" ON public."ProjectMembership" USING btree ("userId");


--
-- Name: ProjectMembership_userId_projectId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProjectMembership_userId_projectId_key" ON public."ProjectMembership" USING btree ("userId", "projectId");


--
-- Name: Report_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Report_category_idx" ON public."Report" USING btree (category);


--
-- Name: Report_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Report_projectId_idx" ON public."Report" USING btree ("projectId");


--
-- Name: Segment_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Segment_projectId_idx" ON public."Segment" USING btree ("projectId");


--
-- Name: Segment_projectId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Segment_projectId_name_key" ON public."Segment" USING btree ("projectId", name);


--
-- Name: UserSchema_projectId_field_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserSchema_projectId_field_key" ON public."UserSchema" USING btree ("projectId", field);


--
-- Name: UserSchema_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserSchema_projectId_idx" ON public."UserSchema" USING btree ("projectId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Widget_dashboardId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Widget_dashboardId_idx" ON public."Widget" USING btree ("dashboardId");


--
-- Name: AuditLog AuditLog_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Dashboard Dashboard_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Dashboard"
    ADD CONSTRAINT "Dashboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EventSchema EventSchema_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventSchema"
    ADD CONSTRAINT "EventSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Event Event_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Event"
    ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IdHierarchy IdHierarchy_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IdHierarchy"
    ADD CONSTRAINT "IdHierarchy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IdMapping IdMapping_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IdMapping"
    ADD CONSTRAINT "IdMapping_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IdMapping IdMapping_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IdMapping"
    ADD CONSTRAINT "IdMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invitation Invitation_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invitation"
    ADD CONSTRAINT "Invitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Profile Profile_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectMembership ProjectMembership_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectMembership"
    ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectMembership ProjectMembership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectMembership"
    ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Report Report_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Segment Segment_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Segment"
    ADD CONSTRAINT "Segment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSchema UserSchema_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSchema"
    ADD CONSTRAINT "UserSchema_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Widget Widget_dashboardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Widget"
    ADD CONSTRAINT "Widget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES public."Dashboard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict s9YcI9DTqzizu3ekDqEcRCd4HltEHCJMGpccjc79tFgDyZRAqgxwbJz0pR3Hjdk

