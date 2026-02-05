--
-- PostgreSQL database dump
--

\restrict PV5eldRZ3LNLdXSxyfn3AX1w2GPdCa8YpcN59tLEdnBoa1LDrLu7KSpaLnOQZ7v

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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wikis id; Type: DEFAULT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis ALTER COLUMN id SET DEFAULT nextval('public.wikis_id_seq'::regclass);


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
-- Data for Name: wikis; Type: TABLE DATA; Schema: public; Owner: destek_user
--

COPY public.wikis (id, title, slug, is_private, category, tags, views, created_at, updated_at, creator_id, department_id) FROM stdin;
\.


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.departments_id_seq', 17, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.tickets_id_seq', 12, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.users_id_seq', 50, true);


--
-- Name: wikis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: destek_user
--

SELECT pg_catalog.setval('public.wikis_id_seq', 1, false);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wikis wikis_pkey; Type: CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.wikis
    ADD CONSTRAINT wikis_pkey PRIMARY KEY (id);


--
-- Name: ix_departments_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_departments_id ON public.departments USING btree (id);


--
-- Name: ix_departments_name; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE UNIQUE INDEX ix_departments_name ON public.departments USING btree (name);


--
-- Name: ix_tickets_id; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_tickets_id ON public.tickets USING btree (id);


--
-- Name: ix_tickets_title; Type: INDEX; Schema: public; Owner: destek_user
--

CREATE INDEX ix_tickets_title ON public.tickets USING btree (title);


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
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


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
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: destek_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


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

\unrestrict PV5eldRZ3LNLdXSxyfn3AX1w2GPdCa8YpcN59tLEdnBoa1LDrLu7KSpaLnOQZ7v

