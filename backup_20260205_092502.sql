--
-- PostgreSQL database dump
--

\restrict Vv5oHuo7JAiczCcPmbSfzZrn3HuEBqPjremnsLsXCtZVM3WTr6m2X1ZaXGSm8bZ

-- Dumped from database version 13.23 (Debian 13.23-1.pgdg13+1)
-- Dumped by pg_dump version 13.23 (Debian 13.23-1.pgdg13+1)

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
-- Name: userrole; Type: TYPE; Schema: public; Owner: destek_user
--

CREATE TYPE public.userrole AS ENUM (
    'USER',
    'DEPARTMENT_ADMIN',
    'SYSTEM_ADMIN'
);


ALTER TYPE public.userrole OWNER TO destek_user;

--
-- Name: visibilitylevel; Type: TYPE; Schema: public; Owner: destek_user
--

CREATE TYPE public.visibilitylevel AS ENUM (
    'PUBLIC',
    'DEPARTMENT',
    'PRIVATE',
    'ADMIN_ONLY'
);


ALTER TYPE public.visibilitylevel OWNER TO destek_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_clients; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.api_clients (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    api_key character varying(64) NOT NULL,
    api_secret character varying(128) NOT NULL,
    is_active boolean,
    can_create_tickets boolean,
    can_read_tickets boolean,
    can_update_tickets boolean,
    can_add_comments boolean,
    allowed_departments text,
    rate_limit_per_minute integer,
    default_department_id integer,
    contact_user_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    last_used_at timestamp without time zone
);


ALTER TABLE public.api_clients OWNER TO destek_user;

--
-- Name: api_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.api_clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_clients_id_seq OWNER TO destek_user;

--
-- Name: api_clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.api_clients_id_seq OWNED BY public.api_clients.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    filename character varying,
    file_path character varying,
    content_type character varying,
    file_size integer,
    created_at timestamp without time zone,
    ticket_id integer,
    uploaded_by integer
);


ALTER TABLE public.attachments OWNER TO destek_user;

--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attachments_id_seq OWNER TO destek_user;

--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    user_id integer,
    ticket_id integer
);


ALTER TABLE public.comments OWNER TO destek_user;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO destek_user;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying,
    description character varying,
    manager_id integer,
    created_at timestamp without time zone
);


ALTER TABLE public.departments OWNER TO destek_user;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departments_id_seq OWNER TO destek_user;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: email_config; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.email_config (
    id integer NOT NULL,
    smtp_server character varying(100),
    smtp_port integer,
    smtp_username character varying(100),
    smtp_password character varying(100),
    smtp_use_tls boolean,
    from_email character varying(100),
    from_name character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.email_config OWNER TO destek_user;

--
-- Name: email_config_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.email_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.email_config_id_seq OWNER TO destek_user;

--
-- Name: email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.email_config_id_seq OWNED BY public.email_config.id;


--
-- Name: general_config; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.general_config (
    id integer NOT NULL,
    app_name character varying(100),
    app_version character varying(20),
    maintenance_mode boolean,
    maintenance_message text,
    max_file_size_mb integer,
    allowed_file_types text,
    upload_directory character varying(255),
    email_notifications_enabled boolean,
    default_department_id integer,
    smtp_server character varying(100),
    smtp_port integer,
    smtp_username character varying(100),
    smtp_password character varying(100),
    ldap_enabled boolean,
    ldap_server character varying(100),
    custom_logo_url character varying(500),
    ldap_port integer,
    ldap_base_dn character varying(200),
    ldap_user_filter character varying(200),
    enable_teos_id boolean,
    enable_citizenship_no boolean,
    require_teos_id boolean,
    require_citizenship_no boolean,
    require_manager_assignment boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    workflow_enabled boolean,
    triage_user_id integer,
    triage_department_id integer,
    triage_enabled_at timestamp without time zone,
    triage_disabled_at timestamp without time zone,
    escalation_enabled boolean,
    escalation_target_user_id integer,
    escalation_target_department_id integer,
    timeout_critical integer,
    timeout_high integer,
    timeout_medium integer,
    timeout_low integer
);


ALTER TABLE public.general_config OWNER TO destek_user;

--
-- Name: general_config_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.general_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.general_config_id_seq OWNER TO destek_user;

--
-- Name: general_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.general_config_id_seq OWNED BY public.general_config.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    user_id integer,
    email_notifications boolean,
    browser_notifications boolean,
    ticket_created boolean,
    ticket_assigned boolean,
    ticket_updated boolean,
    ticket_commented boolean,
    ticket_attachment boolean,
    wiki_created boolean,
    wiki_updated boolean,
    wiki_shared boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.notification_settings OWNER TO destek_user;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notification_settings_id_seq OWNER TO destek_user;

--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title character varying(255),
    message text,
    type character varying(50),
    is_read boolean,
    related_id integer,
    created_at timestamp without time zone,
    email_sent boolean,
    user_id integer
);


ALTER TABLE public.notifications OWNER TO destek_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO destek_user;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.system_logs (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    user_id integer,
    username character varying(100),
    target_type character varying(50),
    target_id integer,
    target_name character varying(255),
    details text,
    status character varying(20) DEFAULT 'success'::character varying,
    error_message text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_logs OWNER TO destek_user;

--
-- Name: system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.system_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_logs_id_seq OWNER TO destek_user;

--
-- Name: system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.system_logs_id_seq OWNED BY public.system_logs.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    title character varying,
    description text,
    priority character varying,
    status character varying,
    visibility_level public.visibilitylevel,
    is_private boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    last_escalation_at timestamp without time zone,
    escalation_count integer,
    creator_id integer,
    assignee_id integer,
    department_id integer,
    source character varying(20) DEFAULT 'web'::character varying,
    external_ref character varying(100),
    api_client_id integer
);


ALTER TABLE public.tickets OWNER TO destek_user;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickets_id_seq OWNER TO destek_user;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: user_departments; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.user_departments (
    user_id integer,
    department_id integer
);


ALTER TABLE public.user_departments OWNER TO destek_user;

--
-- Name: user_login_logs; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.user_login_logs (
    id integer NOT NULL,
    user_id integer,
    login_time timestamp without time zone,
    ip_address character varying(45),
    user_agent text,
    success boolean,
    failure_reason character varying
);


ALTER TABLE public.user_login_logs OWNER TO destek_user;

--
-- Name: user_login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.user_login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_login_logs_id_seq OWNER TO destek_user;

--
-- Name: user_login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.user_login_logs_id_seq OWNED BY public.user_login_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying,
    email character varying,
    full_name character varying,
    hashed_password character varying,
    is_active boolean,
    is_admin boolean,
    is_ldap boolean,
    role public.userrole,
    department_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    browser_notification_token character varying(500) DEFAULT NULL::character varying
);


ALTER TABLE public.users OWNER TO destek_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO destek_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.webhook_logs (
    id integer NOT NULL,
    webhook_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    payload text NOT NULL,
    response_status integer,
    response_body text,
    success boolean,
    error_message text,
    retry_count integer,
    created_at timestamp without time zone
);


ALTER TABLE public.webhook_logs OWNER TO destek_user;

--
-- Name: webhook_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.webhook_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webhook_logs_id_seq OWNER TO destek_user;

--
-- Name: webhook_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.webhook_logs_id_seq OWNED BY public.webhook_logs.id;


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.webhooks (
    id integer NOT NULL,
    api_client_id integer NOT NULL,
    url character varying(500) NOT NULL,
    secret character varying(128),
    events text NOT NULL,
    is_active boolean,
    max_retries integer,
    retry_delay_seconds integer,
    last_triggered_at timestamp without time zone,
    last_success_at timestamp without time zone,
    last_failure_at timestamp without time zone,
    failure_count integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.webhooks OWNER TO destek_user;

--
-- Name: webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.webhooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.webhooks_id_seq OWNER TO destek_user;

--
-- Name: webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.webhooks_id_seq OWNED BY public.webhooks.id;


--
-- Name: wiki_department_shares; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.wiki_department_shares (
    wiki_id integer,
    department_id integer
);


ALTER TABLE public.wiki_department_shares OWNER TO destek_user;

--
-- Name: wiki_revisions; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.wiki_revisions (
    id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone,
    wiki_id integer,
    creator_id integer
);


ALTER TABLE public.wiki_revisions OWNER TO destek_user;

--
-- Name: wiki_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.wiki_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wiki_revisions_id_seq OWNER TO destek_user;

--
-- Name: wiki_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.wiki_revisions_id_seq OWNED BY public.wiki_revisions.id;


--
-- Name: wiki_user_shares; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.wiki_user_shares (
    wiki_id integer,
    user_id integer
);


ALTER TABLE public.wiki_user_shares OWNER TO destek_user;

--
-- Name: wikis; Type: TABLE; Schema: public; Owner: destek_user
--

CREATE TABLE public.wikis (
    id integer NOT NULL,
    title character varying,
    slug character varying,
    is_private boolean,
    category character varying,
    tags character varying,
    views integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    creator_id integer,
    department_id integer
);


ALTER TABLE public.wikis OWNER TO destek_user;

--
-- Name: wikis_id_seq; Type: SEQUENCE; Schema: public; Owner: destek_user
--

CREATE SEQUENCE public.wikis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wikis_id_seq OWNER TO destek_user;

--
-- Name: wikis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: destek_user
--

ALTER SEQUENCE public.wikis_id_seq OWNED BY public.wikis.id;


--
-- Name: api_clients id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.api_clients ALTER COLUMN id SET DEFAULT nextval('public.api_clients_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: email_config id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.email_config ALTER COLUMN id SET DEFAULT nextval('public.email_config_id_seq'::regclass);


--
-- Name: general_config id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config ALTER COLUMN id SET DEFAULT nextval('public.general_config_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: system_logs id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.system_logs ALTER COLUMN id SET DEFAULT nextval('public.system_logs_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: user_login_logs id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.user_login_logs ALTER COLUMN id SET DEFAULT nextval('public.user_login_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: webhook_logs id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhook_logs ALTER COLUMN id SET DEFAULT nextval('public.webhook_logs_id_seq'::regclass);


--
-- Name: webhooks id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhooks ALTER COLUMN id SET DEFAULT nextval('public.webhooks_id_seq'::regclass);


--
-- Name: wiki_revisions id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_revisions ALTER COLUMN id SET DEFAULT nextval('public.wiki_revisions_id_seq'::regclass);


--
-- Name: wikis id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis ALTER COLUMN id SET DEFAULT nextval('public.wikis_id_seq'::regclass);


--
-- Data for Name: api_clients; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.api_clients (id, name, description, api_key, api_secret, is_active, can_create_tickets, can_read_tickets, can_update_tickets, can_add_comments, allowed_departments, rate_limit_per_minute, default_department_id, contact_user_id, created_at, updated_at, last_used_at) FROM stdin;
1	Crm 		b84fbc31cfacd658dd54b4673dd897fb	312a158b28f91a3e8980a30d986aa9077ad3a23212e1ee82a26bbf647f0ff9f0	t	t	t	t	t	\N	60	6	\N	2026-02-01 14:02:53.945027	2026-02-02 07:41:13.377011	\N
2	sdgerh	dsgtrhtyj	a4b79da1425584f39e42d0344463b93f	9d2c7a5010cd7cdde99b750fc815cbb928a506fb14f2f22b91021b2bf65b81b3	t	t	t	t	t	\N	60	13	\N	2026-02-04 08:58:34.284926	2026-02-04 08:58:34.284928	\N
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.attachments (id, filename, file_path, content_type, file_size, created_at, ticket_id, uploaded_by) FROM stdin;
1	customer-service.png	1_8ad6dffb_customer-service.png	image/png	38495	2026-01-27 13:08:05.152978	1	39
2	customer-service.png	2_3c2ee2cd_customer-service.png	image/png	38495	2026-01-27 13:16:21.57361	2	39
3	customer-service.png	6_c0c3e976_customer-service.png	image/png	38495	2026-01-27 13:42:48.860889	6	39
4	IVD-Alindi-bV086QC2Z95.pdf	8_b358d1be_IVD-Alindi-bV086QC2Z95.pdf	application/pdf	7729	2026-02-04 08:40:32.126118	8	1
5	836cc6ef-8eeb-4177-a47c-6f1afa158740.jpeg	9_3bfe4d27_836cc6ef-8eeb-4177-a47c-6f1afa158740.jpeg	image/jpeg	229566	2026-02-04 10:53:54.9972	9	1
6	836cc6ef-8eeb-4177-a47c-6f1afa158740.jpeg	11_1ab5abc7_836cc6ef-8eeb-4177-a47c-6f1afa158740.jpeg	image/jpeg	229566	2026-02-04 11:17:05.233204	11	1
7	6ae96c81-c973-4492-a2c0-86e78f039344.jpeg	10_1cf23d6f_6ae96c81-c973-4492-a2c0-86e78f039344.jpeg	image/jpeg	141044	2026-02-04 11:19:03.231821	10	13
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.comments (id, content, created_at, updated_at, user_id, ticket_id) FROM stdin;
1	6ıuyo	2026-01-27 13:10:26.033587	2026-01-27 13:10:26.033589	39	1
2	oipoi	2026-01-27 13:12:06.735755	2026-01-27 13:12:06.735757	39	1
3	rtutuyk	2026-01-27 13:27:36.904694	2026-01-27 13:27:36.904695	1	1
4	content.js:2417 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (content.js:2417:16)\nwrappedSendMessageCallback @ content.js:2417\nVM71 polyfill.js:501 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (VM71 polyfill.js:501:16)\nwrappedSendMessageCallback @ VM71 polyfill.js:501\ncontent.js:2417 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (content.js:2417:16)\nwrappedSendMessageCallback @ content.js:2417\ncontent.js:2417 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (content.js:2417:16)\nwrappedSendMessageCallback @ content.js:2417\ncontent.js:2417 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (content.js:2417:16)\nwrappedSendMessageCallback @ content.js:2417\ncontent.js:2417 Uncaught (in promise) Error: IO error: .../069717.ldb: FILE_ERROR_NO_SPACE (ChromeMethodBFE: 3::WritableFileAppend::8)\n    at wrappedSendMessageCallback (content.js:2417:16)\nwrappedSendMessageCallback @ content.js:2417\n	2026-01-29 13:16:14.874571	2026-01-29 13:16:14.874572	1	5
5	ujtyjuık	2026-02-01 13:36:32.760036	2026-02-01 13:36:32.760037	1	6
6	lhkşukş	2026-02-01 13:46:04.431152	2026-02-01 13:46:04.431153	39	6
7	ghkjhgjkjhk	2026-02-01 13:46:47.266974	2026-02-01 13:46:47.266976	1	6
8	ggfdhg	2026-02-04 08:34:35.52072	2026-02-04 08:34:35.520721	1	7
9	tret	2026-02-04 11:19:36.658375	2026-02-04 11:19:36.658376	13	10
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.departments (id, name, description, manager_id, created_at) FROM stdin;
6	Sistem Yönetim	Sistem Yönetim	\N	2026-01-27 12:57:00.3876
7	Muhasebe	LDAP'tan otomatik oluşturuldu: Muhasebe	\N	2026-01-27 12:57:14.721701
8	Temel Eğitim	LDAP'tan otomatik oluşturuldu: Temel Eğitim	\N	2026-01-27 12:57:14.751441
9	Temel Eğitim Birimi	LDAP'tan otomatik oluşturuldu: Temel Eğitim Birimi	\N	2026-01-27 12:57:14.755631
10	Staj ve Sınav Birimi	LDAP'tan otomatik oluşturuldu: Staj ve Sınav Birimi	\N	2026-01-27 12:57:14.767168
11	Evrak - Arşiv ve Dijitalleştirme	LDAP'tan otomatik oluşturuldu: Evrak - Arşiv ve Dijitalleştirme	\N	2026-01-27 12:57:14.798471
12	Çağrı Merkezi	LDAP'tan otomatik oluşturuldu: Çağrı Merkezi	\N	2026-01-27 12:57:14.818155
13	TEOS	LDAP'tan otomatik oluşturuldu: TEOS	\N	2026-01-27 12:57:14.824179
14	Ulaşım Araçları	LDAP'tan otomatik oluşturuldu: Ulaşım Araçları	\N	2026-01-27 12:57:14.827051
15	Bilgi İşlem	LDAP'tan otomatik oluşturuldu: Bilgi İşlem	\N	2026-01-27 12:57:14.832355
16	Yönetim		\N	2026-01-27 13:37:58.894201
17	Test Departmanı	Test Departmanı	\N	2026-02-04 08:45:25.718627
\.


--
-- Data for Name: email_config; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.email_config (id, smtp_server, smtp_port, smtp_username, smtp_password, smtp_use_tls, from_email, from_name, created_at, updated_at) FROM stdin;
1	mail.tesmer.org.tr	587	noreply@tesmer.org.tr	!!!735m3r!!!	t	noreply@tesmer.org.tr	Destek Talep Sistemi	2026-01-27 12:59:57.777099	2026-01-27 13:03:32.040714
\.


--
-- Data for Name: general_config; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.general_config (id, app_name, app_version, maintenance_mode, maintenance_message, max_file_size_mb, allowed_file_types, upload_directory, email_notifications_enabled, default_department_id, smtp_server, smtp_port, smtp_username, smtp_password, ldap_enabled, ldap_server, custom_logo_url, ldap_port, ldap_base_dn, ldap_user_filter, enable_teos_id, enable_citizenship_no, require_teos_id, require_citizenship_no, require_manager_assignment, created_at, updated_at, workflow_enabled, triage_user_id, triage_department_id, triage_enabled_at, triage_disabled_at, escalation_enabled, escalation_target_user_id, escalation_target_department_id, timeout_critical, timeout_high, timeout_medium, timeout_low) FROM stdin;
1	Destek Talep Sistemi	1.0.0	f	Sistem bakım modunda.	10	pdf,doc,docx,txt,jpg,jpeg,png,gif,tiff,tif,zip,rar	/app/uploads	t	13	\N	587	\N	\N	f		/branding/custom_logo.svg	389			t	f	f	f	f	2026-01-27 12:21:21.146735	2026-02-04 11:14:33.460556	f	\N	6	\N	\N	t	\N	13	3	5	15	35
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.notification_settings (id, user_id, email_notifications, browser_notifications, ticket_created, ticket_assigned, ticket_updated, ticket_commented, ticket_attachment, wiki_created, wiki_updated, wiki_shared, created_at, updated_at) FROM stdin;
3	39	t	f	t	t	t	t	t	t	t	t	2026-01-27 13:04:46.683122	2026-01-27 13:04:46.683124
4	33	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:08:05.121283	2026-01-27 13:08:05.121285
5	16	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:15:00.280156	2026-01-27 13:15:00.280157
6	4	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:16:21.582396	2026-01-27 13:16:21.582399
7	2	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:16:21.598565	2026-01-27 13:16:21.598567
8	3	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:16:21.606946	2026-01-27 13:16:21.606948
9	42	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:32:58.139841	2026-01-27 13:32:58.139842
10	43	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:32:58.150841	2026-01-27 13:32:58.150842
11	14	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:41:38.822314	2026-01-27 13:41:38.822315
12	13	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:41:38.830588	2026-01-27 13:41:38.830589
13	15	t	t	t	t	t	t	t	t	t	t	2026-01-27 13:41:38.838216	2026-01-27 13:41:38.838217
1	1	t	t	t	t	t	t	t	t	t	t	2026-01-27 12:21:43.862985	2026-01-29 13:05:48.50561
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.notifications (id, title, message, type, is_read, related_id, created_at, email_sent, user_id) FROM stdin;
1	Size Atanan Yeni Talep	Size yeni bir talep atandı.	ticket_assigned	f	1	2026-01-27 16:08:05.126883	t	33
2	Dosya Eklendi	Ldap reader dosya ekledi.	ticket_updated	f	1	2026-01-27 16:08:05.165134	t	33
3	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	1	2026-01-27 16:10:24.451208	f	33
4	Talep Güncellendi	Ldap reader güncelledi.	ticket_assigned	f	1	2026-01-27 16:15:00.285941	t	16
5	Dosya Eklendi	Ldap reader dosya ekledi.	ticket_updated	f	2	2026-01-27 16:16:21.587552	t	4
6	Dosya Eklendi	Ldap reader dosya ekledi.	ticket_updated	f	2	2026-01-27 16:16:21.60114	t	2
7	Dosya Eklendi	Ldap reader dosya ekledi.	ticket_updated	f	2	2026-01-27 16:16:21.609499	t	3
8	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:25:10.872703	t	16
9	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:25:10.88204	t	39
10	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:30:40.220901	f	39
11	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:30:40.226666	f	16
12	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:30:44.266313	f	39
13	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	1	2026-01-27 16:30:44.272039	f	16
14	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	3	2026-01-27 16:32:58.143136	t	42
15	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	3	2026-01-27 16:32:58.153498	t	43
16	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	3	2026-01-27 16:32:58.160451	t	33
36	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:45:55.594956	t	4
19	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-27 16:41:38.825651	t	14
20	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-27 16:41:38.833328	t	13
21	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-27 16:41:38.840176	t	15
17	Yönlendirme Bekleyen Talep	Sisteme yeni bir talep düştü.	ticket_created	t	5	2026-01-27 16:41:17.531346	t	1
37	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:45:55.604125	t	2
18	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	t	5	2026-01-27 16:41:38.81618	t	39
25	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:13.577569	f	13
26	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:13.584947	f	14
27	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:13.593185	f	15
28	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:16.691816	f	39
29	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:16.698062	f	13
30	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:16.702159	f	14
31	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	f	5	2026-01-29 16:16:16.706802	f	15
24	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	t	5	2026-01-29 16:16:13.565886	f	39
22	Yönlendirme Bekleyen Talep	Sisteme yeni bir talep düştü.	ticket_created	t	6	2026-01-27 16:42:48.839467	t	1
23	Dosya Eklendi	Ldap reader dosya ekledi.	ticket_updated	t	6	2026-01-27 16:42:48.867645	t	1
33	Yönlendirme Bekleyen Talep	Sisteme yeni bir talep düştü.	ticket_created	f	7	2026-02-01 16:42:53.830256	t	4
34	Yönlendirme Bekleyen Talep	Sisteme yeni bir talep düştü.	ticket_created	f	7	2026-02-01 16:42:53.844317	t	2
35	Yönlendirme Bekleyen Talep	Sisteme yeni bir talep düştü.	ticket_created	f	7	2026-02-01 16:42:53.852653	t	3
32	Talep Güncellendi	Soner UĞUZ güncelledi.	ticket_updated	t	6	2026-02-01 16:36:29.469931	t	39
38	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:45:55.611104	t	3
40	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:46:03.474018	f	4
41	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:46:03.478007	f	2
42	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	f	6	2026-02-01 19:46:03.480858	f	3
44	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 09:36:58.000693	t	42
45	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 09:37:01.954819	t	43
47	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 09:37:09.934724	t	33
48	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:11:58.048446	f	42
49	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:11:58.056317	f	43
51	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:11:58.066393	f	33
52	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:46:58.090899	f	42
53	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:46:58.09825	f	43
55	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	f	7	2026-02-02 10:46:58.106139	f	33
39	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	t	6	2026-02-01 19:45:55.616681	f	1
43	Talep Güncellendi	Ldap reader güncelledi.	ticket_updated	t	6	2026-02-01 19:46:03.48353	f	1
46	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	t	7	2026-02-02 09:37:05.97329	t	1
50	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	t	7	2026-02-02 10:11:58.062373	f	1
54	Otomatik Atama: talep kaynağı deneme	Bu talep zaman aşımı nedeniyle otomatik olarak biriminize atandı.	ticket_assigned	t	7	2026-02-02 10:46:58.102352	f	1
56	Size Atanan Yeni Talep	Size yeni bir talep atandı.	ticket_assigned	f	10	2026-02-04 14:14:46.224928	t	13
57	Size Atanan Yeni Talep	Size yeni bir talep atandı.	ticket_assigned	f	11	2026-02-04 14:17:05.176422	t	13
58	Dosya Eklendi	Emre YILDIRIM dosya ekledi.	ticket_updated	f	10	2026-02-04 14:19:03.240649	t	1
59	Talep Güncellendi	Emre YILDIRIM güncelledi.	ticket_updated	f	10	2026-02-04 14:19:33.461647	f	1
\.


--
-- Data for Name: system_logs; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.system_logs (id, category, action, user_id, username, target_type, target_id, target_name, details, status, error_message, ip_address, user_agent, created_at) FROM stdin;
1	auth	login	1	admin	\N	\N	\N	{"method": "local"}	success	\N	\N	\N	2026-02-05 09:11:33.172869
2	auth	login_failed	1	admin	\N	\N	\N	{"method": "local"}	failed	Şifre yanlış	\N	\N	2026-02-05 09:11:45.670661
3	auth	login_failed	1	admin	\N	\N	\N	{"method": "local"}	failed	Şifre yanlış	\N	\N	2026-02-05 09:11:52.258326
4	auth	login_failed	1	admin	\N	\N	\N	{"method": "local"}	failed	Şifre yanlış	\N	\N	2026-02-05 09:11:58.730583
5	ticket	create	1	admin	ticket	12	bu bir testtir	{"department_id": 17, "assignee_id": null, "priority": "low", "is_private": false}	success	\N	\N	\N	2026-02-05 09:16:56.758611
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.tickets (id, title, description, priority, status, visibility_level, is_private, created_at, updated_at, last_escalation_at, escalation_count, creator_id, assignee_id, department_id, source, external_ref, api_client_id) FROM stdin;
9	bu bir denemedir	bu bir denemedir	critical	open	DEPARTMENT	f	2026-02-04 13:53:54.923023	2026-02-04 10:53:54.924405	\N	0	1	\N	6	web	\N	\N
11	test	denmeedir	high	open	DEPARTMENT	f	2026-02-04 14:17:05.158343	2026-02-04 11:17:05.158628	\N	0	1	13	9	web	\N	\N
10	deneme deneme deneme	deneme	critical	in_progress	DEPARTMENT	f	2026-02-04 14:14:46.089434	2026-02-04 14:19:33.444408	\N	0	1	13	9	web	\N	\N
1	talep oluştururken hata	devdestekapi.tesmer.org.tr/api/tickets/:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)suppressWarnings.js:62 Error creating ticket: jtconsole.error @ suppressWarnings.js:62	low	in_progress	DEPARTMENT	f	2026-01-27 16:08:05.019255	2026-01-27 16:30:44.247945	\N	0	39	16	13	web	\N	\N
3	OTOMATİK TRİAJ	docker compose restart backend	critical	open	DEPARTMENT	f	2026-01-27 16:31:52.396349	2026-01-27 16:32:58.121188	\N	0	1	\N	13	web	\N	\N
4	denemedir	bu bir deneme dir Merhaba, Teos Ekibinin çözüm maili ektedir. İyi çalışmalar dilerim.	low	open	DEPARTMENT	f	2026-01-27 16:39:03.100133	2026-01-27 13:39:03.100619	\N	0	39	\N	6	web	\N	\N
12	bu bir testtir	bu bir testtir	low	open	DEPARTMENT	f	2026-02-05 09:16:56.752618	2026-02-05 06:16:56.753985	\N	0	1	\N	17	web	\N	\N
5	emreye talep	dsghtjytjytj	critical	open	DEPARTMENT	f	2026-01-27 16:41:17.445154	2026-01-29 16:16:16.67898	\N	0	39	\N	9	web	\N	\N
6	bu talep emreye otomatik atanacak mı	Merhaba, Teos Ekibinin çözüm maili ektedir. İyi çalışmalar dilerim.	critical	in_progress	DEPARTMENT	f	2026-01-27 16:42:48.820309	2026-02-01 16:46:03.456242	\N	0	39	\N	6	web	\N	\N
7	talep kaynağı deneme	dfsgfhggh	low	in_progress	DEPARTMENT	f	2026-02-01 16:42:53.748424	2026-02-04 11:34:32.556794	2026-02-04 08:25:33.777061	7	1	\N	13	web	\N	\N
8	Dijital adım android sürümü indirilememe sorunu	dijital adım andribn marketten indirilemiyor ilgilenelim lütfen	critical	open	DEPARTMENT	f	2026-02-04 11:40:31.967439	2026-02-04 08:40:31.968394	\N	0	1	\N	6	web	\N	\N
2	bu bir triaj denemesidir	Login.js:42 POST https://devdestekapi.tesmer.org.tr/api/auth/token 401 (Unauthorized)(anonymous) @ xhr.js:195xhr @ xhr.js:15Un @ dispatchRequest.js:51Promise.then_request @ Axios.js:163request @ Axios.js:40(anonymous) @ Axios.js:226(anonymous) @ bind.js:5onSubmit @ Login.js:42Le @ react-dom.production.min.js:54qe @ react-dom.production.min.js:54(anonymous) @ react-dom.production.min.js:55Ir @ react-dom.production.min.js:105Fr @ react-dom.production.min.js:106(anonymous) @ react-dom.production.min.js:117cc @ react-dom.production.min.js:273Pe @ react-dom.production.min.js:52Vr @ react-dom.production.min.js:109Kt @ react-dom.production.min.js:74Wt @ react-dom.production.min.js:73suppressWarnings.js:62 Login error: jt {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}console.error @ suppressWarnings.js:62onSubmit @ Login.js:65await in onSubmitLe @ react-dom.production.min.js:54qe @ react-dom.production.min.js:54(anonymous) @ react-dom.production.min.js:55Ir @ react-dom.production.min.js:105Fr @ react-dom.production.min.js:106(anonymous) @ react-dom.production.min.js:117cc @ react-dom.production.min.js:273Pe @ react-dom.production.min.js:52Vr @ react-dom.production.min.js:109Kt @ react-dom.production.min.js:74Wt @ react-dom.production.min.js:73Login.js:42 POST https://devdestekapi.tesmer.org.tr/api/auth/token 401 (Unauthorized)(anonymous) @ xhr.js:195xhr @ xhr.js:15Un @ dispatchRequest.js:51Promise.then_request @ Axios.js:163request @ Axios.js:40(anonymous) @ Axios.js:226(anonymous) @ bind.js:5onSubmit @ Login.js:42Le @ react-dom.production.min.js:54qe @ react-dom.production.min.js:54(anonymous) @ react-dom.production.min.js:55Ir @ react-dom.production.min.js:105Fr @ react-dom.production.min.js:106(anonymous) @ react-dom.production.min.js:117cc @ react-dom.production.min.js:273Pe @ react-dom.production.min.js:52Vr @ react-dom.production.min.js:109Kt @ react-dom.production.min.js:74Wt @ react-dom.production.min.js:73suppressWarnings.js:62 Login error: jt {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}console.error @ suppressWarnings.js:62onSubmit @ Login.js:65await in onSubmitLe @ react-dom.production.min.js:54qe @ react-dom.production.min.js:54(anonymous) @ react-dom.production.min.js:55Ir @ react-dom.production.min.js:105Fr @ react-dom.production.min.js:106(anonymous) @ react-dom.production.min.js:117cc @ react-dom.production.min.js:273Pe @ react-dom.production.min.js:52Vr @ react-dom.production.min.js:109Kt @ react-dom.production.min.js:74Wt @ react-dom.production.min.js:73	critical	closed	DEPARTMENT	f	2026-01-27 16:16:21.540952	2026-02-04 11:42:07.781663	\N	0	39	\N	6	web	\N	\N
\.


--
-- Data for Name: user_departments; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.user_departments (user_id, department_id) FROM stdin;
42	13
43	13
3	16
4	16
1	6
\.


--
-- Data for Name: user_login_logs; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.user_login_logs (id, user_id, login_time, ip_address, user_agent, success, failure_reason) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.users (id, username, email, full_name, hashed_password, is_active, is_admin, is_ldap, role, department_id, created_at, updated_at, browser_notification_token) FROM stdin;
44	emre.naim	emre.naim@tesmer.local	Emre Naim		t	f	t	USER	10	2026-02-01 13:40:32.362251	2026-02-01 13:40:32.362252	\N
6	mustafa.budak	mustafa@tesmer.org.tr	Mustafa BUDAK		t	f	t	USER	7	2026-01-27 12:57:14.727725	2026-01-27 12:57:14.727726	\N
7	caner.ozer	caner@tesmer.org.tr	Caner ÖZER		t	f	t	USER	7	2026-01-27 12:57:14.732711	2026-01-27 12:57:14.732712	\N
8	songul.sen	ssen@luca.com.tr	Songül ŞEN		t	f	t	USER	7	2026-01-27 12:57:14.736539	2026-01-27 12:57:14.73654	\N
9	nazlican.simsek	nazlican@tesmer.org.tr	Nazlıcan ŞİMŞEK		t	f	t	USER	7	2026-01-27 12:57:14.738818	2026-01-27 12:57:14.738819	\N
10	nesrin.baser	nesrin@tesmer.org.tr	Nesrin BAŞER		t	f	t	USER	7	2026-01-27 12:57:14.743236	2026-01-27 12:57:14.743237	\N
11	yagmur.arslanali	yarslanali@luca.com.tr	Yağmur ARSLANALİ		t	f	t	USER	7	2026-01-27 12:57:14.748144	2026-01-27 12:57:14.748145	\N
12	mkemal.gultekin	mkemal@tesmer.org.tr	Mustafa Kemal GÜLTEKİN		t	f	t	USER	8	2026-01-27 12:57:14.752632	2026-01-27 12:57:14.752636	\N
13	emre.yildirim	emre@tesmer.org.tr	Emre YILDIRIM		t	f	t	USER	9	2026-01-27 12:57:14.756654	2026-01-27 12:57:14.756655	\N
14	riza.divrikli	riza@tesmer.org.tr	Rıza DİVRİKLİ		t	f	t	USER	9	2026-01-27 12:57:14.761021	2026-01-27 12:57:14.761021	\N
15	zerrin.senoz	zerrins@tesmer.org.tr	Zerrin ŞENÖZ		t	f	t	USER	9	2026-01-27 12:57:14.765132	2026-01-27 12:57:14.765133	\N
17	alpercan.mazlum	alpercan@tesmer.org.tr	Alper Can MAZLUM		t	f	t	USER	10	2026-01-27 12:57:14.771516	2026-01-27 12:57:14.771517	\N
18	cuneyt.gezener	cuneyt@tesmer.org.tr	Cüneyt Behçet GEZENER		t	f	t	USER	10	2026-01-27 12:57:14.775144	2026-01-27 12:57:14.775145	\N
19	emrah.yilmaz	emrah@tesmer.org.tr	Emrah YILMAZ		t	f	t	USER	10	2026-01-27 12:57:14.778695	2026-01-27 12:57:14.778696	\N
20	kadir.kavkaci	kadirk@tesmer.org.tr	Kadir KAVKACI		t	f	t	USER	10	2026-01-27 12:57:14.782668	2026-01-27 12:57:14.782669	\N
21	ozkan.bikmaz	ozkanb@tesmer.org.tr	Özkan BIKMAZ		t	f	t	USER	10	2026-01-27 12:57:14.785928	2026-01-27 12:57:14.785929	\N
22	sedef.sakar	sedefs@tesmer.org.tr	Sedef ŞAKAR		t	f	t	USER	10	2026-01-27 12:57:14.788878	2026-01-27 12:57:14.788879	\N
23	selda.karadol	selda@tesmer.org.tr	Selda KARADÖL		t	f	t	USER	10	2026-01-27 12:57:14.792837	2026-01-27 12:57:14.792839	\N
24	serhan.olmez	serhan@tesmer.org.tr	Serhan ÖLMEZ		t	f	t	USER	10	2026-01-27 12:57:14.796296	2026-01-27 12:57:14.796297	\N
25	fatma.ceylan	tesmerfatma@gmail.com	Fatma CEYLAN		t	f	t	USER	11	2026-01-27 12:57:14.79991	2026-01-27 12:57:14.799911	\N
26	ecevit.yildirim	ecevit@tesmer.org.tr	Ecevit YILDIRIM		t	f	t	USER	11	2026-01-27 12:57:14.80384	2026-01-27 12:57:14.803842	\N
27	mustafa.demirel	mdemirel@tesmer.org.tr	Mustafa DEMİREL		t	f	t	USER	11	2026-01-27 12:57:14.807287	2026-01-27 12:57:14.807288	\N
28	oktay.kandemir	oktay@tesmer.org.tr	Oktay KANDEMİR		t	f	t	USER	11	2026-01-27 12:57:14.810752	2026-01-27 12:57:14.810753	\N
29	ramazan.ergin	ramazan@tesmer.org.tr	Ramazan ERGİN		t	f	t	USER	11	2026-01-27 12:57:14.81324	2026-01-27 12:57:14.81324	\N
30	serife.yaman	serifeb@tesmer.org.tr	Şerife BEDER YAMAN		t	f	t	USER	11	2026-01-27 12:57:14.816105	2026-01-27 12:57:14.816106	\N
31	nermin.yildiz	nerminy@tesmer.org.tr	Nermin YILDIZ		t	f	t	USER	12	2026-01-27 12:57:14.819462	2026-01-27 12:57:14.819463	\N
32	seray.tombul	serayt@tesmer.org.tr	Seray TONBUL		t	f	t	USER	12	2026-01-27 12:57:14.822106	2026-01-27 12:57:14.822107	\N
35	hasan.bayindir	hasan.bayindir@tesmer.local	Hasan BAYINDIR		t	f	t	USER	7	2026-01-27 12:57:14.83055	2026-01-27 12:57:14.830551	\N
36	ebru.kaplan	ebru.kaplan@tesmer.local	Ebru KAPLAN		t	f	t	USER	15	2026-01-27 12:57:14.833674	2026-01-27 12:57:14.833675	\N
37	ismail.acabay	ismail.acabay@tesmer.local	İsmail ACABAY		t	f	t	USER	15	2026-01-27 12:57:14.836146	2026-01-27 12:57:14.836147	\N
40	hilal.ozmen	hilal.ozmen@tesmer.local	Hilal Özmen		t	f	t	USER	\N	2026-01-27 12:57:14.842691	2026-01-27 12:57:14.842692	\N
41	cagdas.aydin	caydin@tesmer.org.tr	Çağdaş AYDIN		t	f	t	USER	7	2026-01-27 12:57:14.845206	2026-01-27 12:57:14.845207	\N
42	ken	ken@ydteknoloji.com	Kenan ALGAN	$2b$12$VfB41RZWkk3ChgJsEwWEqus5kBdCXlSzMkUZLG6oM0iLvLSHUznRq	t	f	f	USER	13	2026-01-27 12:58:36.369476	2026-01-27 12:59:17.186245	\N
43	samet.yuksel	samet.yuksel@ydteknoloji.com	Samet YÜKSEL	$2b$12$6Q6M4KWdMIV7s8Rxe5zEbuXSES6r8xN73dhOf0lI3/wlNpJLa87f2	t	f	f	USER	13	2026-01-27 12:59:07.806273	2026-01-27 12:59:23.155996	\N
45	begum.yildirim	begum.yildirim@tesmer.local	Begüm Yıldırım		t	f	t	USER	10	2026-02-01 13:40:32.365135	2026-02-01 13:40:32.365135	\N
1	admin	soner@tesmer.org.tr	Soner UĞUZ	$2b$12$JBRmirbinpqXQj9ZcKrZY.eajwuZVFuKZKiGsnVkKE0.2r7536rRW	t	t	f	USER	6	2026-01-27 12:21:21.147948	2026-01-27 13:38:41.391869	\N
50	oguzhan.balli	oguzhan.balli@ydteknoloji.com	Oğuzhan BALLI	$2b$12$KH1q5aR70PRAbcPwMuSak.KKI6Fx.T72XUiAnyIBaqDPh93S8Fcou	t	f	f	\N	13	2026-02-04 14:38:02.299531	\N	\N
5	nurcan.kocabas	nurcan@tesmer.org.tr	Nurcan KOCABAŞ		t	f	t	USER	7	2026-01-27 12:57:14.722965	2026-02-02 08:11:30.7334	\N
47	bilge.bakkal	bilge.bakkal@ydteknoloji.com	Bilge BAKKAL	$2b$12$kDWPlxyfbbGAIdEv5fhIHeqKKdMGcu7rbQ24e07BCB7ncT8DZuaRG	t	f	f	\N	13	2026-02-04 14:38:02.299531	\N	\N
4	zeliha.divrikli	zelihay@tesmer.org.tr	Zeliha DİVRİKLİ		t	f	t	USER	6	2026-01-27 12:57:14.717674	2026-02-01 13:40:32.334708	\N
33	shares	shares@tesmer.local	umit.colpan		t	f	t	USER	13	2026-01-27 12:57:14.825376	2026-02-02 08:11:30.754415	\N
38	soner.uguz	soner@tesmer.local	Soner UĞUZ		t	f	t	USER	15	2026-01-27 12:57:14.838903	2026-02-02 08:11:30.761576	\N
48	metehan.teber	metehan.teber@ydteknoloji.com	Metehan TEBER	$2b$12$V3JkCwCDnZgnRn.0YYQCpuGdNEIg30A08jnknYUnrh.IFfvllHt72	t	f	f	\N	13	2026-02-04 14:38:02.299531	\N	\N
2	cemal.yukselen	cemalyukselen@tesmer.org.tr	Cemal YÜKSELEN		f	f	t	USER	6	2026-01-27 12:57:14.692735	2026-02-02 08:12:51.047087	\N
39	ldapreader	ldapreader@tesmer.local	Ldap reader		t	f	t	USER	\N	2026-01-27 12:57:14.840761	2026-02-04 08:46:19.044739	\N
16	gül.akdemir	gul@tesmer.org.tr	Gül AKDEMİR		t	f	t	USER	10	2026-01-27 12:57:14.769201	2026-02-02 08:07:26.166384	\N
34	sadettin.guner	gunersadettin@hotmail.com	Sadettin GÜNER		t	f	t	USER	14	2026-01-27 12:57:14.8281	2026-02-02 08:07:26.184217	\N
3	aliriza.eren	alirizaeren@tesmer.org.tr	Ali Rıza EREN		t	f	t	USER	16	2026-01-27 12:57:14.712892	2026-02-04 08:47:16.035513	\N
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.webhook_logs (id, webhook_id, event_type, payload, response_status, response_body, success, error_message, retry_count, created_at) FROM stdin;
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.webhooks (id, api_client_id, url, secret, events, is_active, max_retries, retry_delay_seconds, last_triggered_at, last_success_at, last_failure_at, failure_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wiki_department_shares; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.wiki_department_shares (wiki_id, department_id) FROM stdin;
\.


--
-- Data for Name: wiki_revisions; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.wiki_revisions (id, content, created_at, wiki_id, creator_id) FROM stdin;
\.


--
-- Data for Name: wiki_user_shares; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.wiki_user_shares (wiki_id, user_id) FROM stdin;
\.


--
-- Data for Name: wikis; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.wikis (id, title, slug, is_private, category, tags, views, created_at, updated_at, creator_id, department_id) FROM stdin;
\.


--
-- Name: api_clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.api_clients_id_seq', 2, true);


--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.attachments_id_seq', 7, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.comments_id_seq', 9, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.departments_id_seq', 17, true);


--
-- Name: email_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.email_config_id_seq', 1, true);


--
-- Name: general_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.general_config_id_seq', 1, true);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 13, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.notifications_id_seq', 59, true);


--
-- Name: system_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.system_logs_id_seq', 5, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.tickets_id_seq', 12, true);


--
-- Name: user_login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.user_login_logs_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.users_id_seq', 50, true);


--
-- Name: webhook_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.webhook_logs_id_seq', 1, false);


--
-- Name: webhooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.webhooks_id_seq', 1, false);


--
-- Name: wiki_revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.wiki_revisions_id_seq', 1, false);


--
-- Name: wikis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.wikis_id_seq', 1, false);


--
-- Name: api_clients api_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.api_clients
    ADD CONSTRAINT api_clients_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- Name: general_config general_config_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: user_login_logs user_login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: wiki_revisions wiki_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_revisions
    ADD CONSTRAINT wiki_revisions_pkey PRIMARY KEY (id);


--
-- Name: wikis wikis_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis
    ADD CONSTRAINT wikis_pkey PRIMARY KEY (id);


--
-- Name: idx_system_logs_action; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_system_logs_action ON public.system_logs USING btree (action);


--
-- Name: idx_system_logs_category; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_system_logs_category ON public.system_logs USING btree (category);


--
-- Name: idx_system_logs_created_at; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at);


--
-- Name: idx_system_logs_user_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id);


--
-- Name: idx_user_login_logs_login_time; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_user_login_logs_login_time ON public.user_login_logs USING btree (login_time);


--
-- Name: idx_user_login_logs_user_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX idx_user_login_logs_user_id ON public.user_login_logs USING btree (user_id);


--
-- Name: ix_api_clients_api_key; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_api_clients_api_key ON public.api_clients USING btree (api_key);


--
-- Name: ix_api_clients_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_api_clients_id ON public.api_clients USING btree (id);


--
-- Name: ix_attachments_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_attachments_id ON public.attachments USING btree (id);


--
-- Name: ix_comments_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_comments_id ON public.comments USING btree (id);


--
-- Name: ix_departments_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_departments_id ON public.departments USING btree (id);


--
-- Name: ix_departments_name; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_departments_name ON public.departments USING btree (name);


--
-- Name: ix_email_config_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_email_config_id ON public.email_config USING btree (id);


--
-- Name: ix_general_config_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_general_config_id ON public.general_config USING btree (id);


--
-- Name: ix_notification_settings_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_notification_settings_id ON public.notification_settings USING btree (id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_tickets_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_tickets_id ON public.tickets USING btree (id);


--
-- Name: ix_tickets_title; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_tickets_title ON public.tickets USING btree (title);


--
-- Name: ix_user_login_logs_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_user_login_logs_id ON public.user_login_logs USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_webhook_logs_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_webhook_logs_id ON public.webhook_logs USING btree (id);


--
-- Name: ix_webhooks_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_webhooks_id ON public.webhooks USING btree (id);


--
-- Name: ix_wiki_revisions_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_wiki_revisions_id ON public.wiki_revisions USING btree (id);


--
-- Name: ix_wikis_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_wikis_id ON public.wikis USING btree (id);


--
-- Name: ix_wikis_slug; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_wikis_slug ON public.wikis USING btree (slug);


--
-- Name: ix_wikis_title; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_wikis_title ON public.wikis USING btree (title);


--
-- Name: api_clients api_clients_contact_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.api_clients
    ADD CONSTRAINT api_clients_contact_user_id_fkey FOREIGN KEY (contact_user_id) REFERENCES public.users(id);


--
-- Name: api_clients api_clients_default_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.api_clients
    ADD CONSTRAINT api_clients_default_department_id_fkey FOREIGN KEY (default_department_id) REFERENCES public.departments(id);


--
-- Name: attachments attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: comments comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: general_config general_config_default_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_default_department_id_fkey FOREIGN KEY (default_department_id) REFERENCES public.departments(id);


--
-- Name: general_config general_config_escalation_target_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_escalation_target_department_id_fkey FOREIGN KEY (escalation_target_department_id) REFERENCES public.departments(id);


--
-- Name: general_config general_config_escalation_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_escalation_target_user_id_fkey FOREIGN KEY (escalation_target_user_id) REFERENCES public.users(id);


--
-- Name: general_config general_config_triage_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_triage_department_id_fkey FOREIGN KEY (triage_department_id) REFERENCES public.departments(id);


--
-- Name: general_config general_config_triage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.general_config
    ADD CONSTRAINT general_config_triage_user_id_fkey FOREIGN KEY (triage_user_id) REFERENCES public.users(id);


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: system_logs system_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_api_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_api_client_id_fkey FOREIGN KEY (api_client_id) REFERENCES public.api_clients(id);


--
-- Name: tickets tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: tickets tickets_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: tickets tickets_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: user_departments user_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: user_departments user_departments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_login_logs user_login_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.user_login_logs
    ADD CONSTRAINT user_login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: webhook_logs webhook_logs_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id);


--
-- Name: webhooks webhooks_api_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_api_client_id_fkey FOREIGN KEY (api_client_id) REFERENCES public.api_clients(id);


--
-- Name: wiki_department_shares wiki_department_shares_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_department_shares
    ADD CONSTRAINT wiki_department_shares_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: wiki_department_shares wiki_department_shares_wiki_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_department_shares
    ADD CONSTRAINT wiki_department_shares_wiki_id_fkey FOREIGN KEY (wiki_id) REFERENCES public.wikis(id);


--
-- Name: wiki_revisions wiki_revisions_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_revisions
    ADD CONSTRAINT wiki_revisions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: wiki_revisions wiki_revisions_wiki_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_revisions
    ADD CONSTRAINT wiki_revisions_wiki_id_fkey FOREIGN KEY (wiki_id) REFERENCES public.wikis(id);


--
-- Name: wiki_user_shares wiki_user_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_user_shares
    ADD CONSTRAINT wiki_user_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: wiki_user_shares wiki_user_shares_wiki_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wiki_user_shares
    ADD CONSTRAINT wiki_user_shares_wiki_id_fkey FOREIGN KEY (wiki_id) REFERENCES public.wikis(id);


--
-- Name: wikis wikis_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis
    ADD CONSTRAINT wikis_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: wikis wikis_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis
    ADD CONSTRAINT wikis_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Vv5oHuo7JAiczCcPmbSfzZrn3HuEBqPjremnsLsXCtZVM3WTr6m2X1ZaXGSm8bZ

