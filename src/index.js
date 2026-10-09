import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS configuration for Cloudflare Pages and local development
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        origin.includes('pages.dev') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('radhelaserstudio')
      ) {
        return origin;
      }
      return '*';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
);

// Initial Portfolio Dataset
const portfolioItems = [
  {
    _id: 'port-1',
    title: 'Precision Laser Cut Geometric Panels',
    category: 'Laser Cutting',
    material: '3.5mm Cast Acrylic & MDF',
    description:
      'High-tolerance CO₂ laser cut decorative pattern panels for interior architectural application in Ahmedabad.',
    imageUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-2',
    title: 'Corporate Reception 3D Acrylic Logo',
    category: 'Signage',
    material: 'Gold Mirror Acrylic on 5mm Matte Black Backing',
    description:
      'Dual-layer precision laser cut corporate reception branding with clean bevel and wall standoff mounts.',
    imageUrl:
      'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-3',
    title: 'Dimensional Solid Acrylic Letters',
    category: 'Acrylic',
    material: '8mm High-Gloss Cast Acrylic',
    description:
      'Crisp laser contoured typography with laser polished edges for showroom entry display.',
    imageUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-4',
    title: 'Laser Carved MDF Jali Décor Screen',
    category: 'MDF',
    material: '12mm High-Density Engineered MDF',
    description:
      'Complex lattice cut pattern without edge burn, calibrated for residential partition installation.',
    imageUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-5',
    title: 'Custom Acrylic Villa Name Plate',
    category: 'Name Plates',
    material: 'Frosted Acrylic + Rose Gold Mirror Accents',
    description:
      'Customized residential entrance name plate with weatherproof laser engraving and brass hardware.',
    imageUrl:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-6',
    title: 'Retail Storefront Backlit Acrylic Sign Board',
    category: 'Branding',
    material: 'Translucent White Acrylic + Black Acrylic Borders',
    description:
      'Durable illuminated retail fascia lettering prepared for LED backlighting and weather exposure.',
    imageUrl:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-7',
    title: 'Custom LED Flex Neon Event Sign',
    category: 'Décor',
    material: 'Laser Cut Clear Acrylic Backing + Silicone Neon',
    description:
      'Contour-cut transparent acrylic base with warm amber neon tubing for wedding and stage backdrop.',
    imageUrl:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-8',
    title: 'Laser Engraved Wooden Corporate Desktop Organizers',
    category: 'Gifts',
    material: 'Natural Steamed Beechwood & Birch Ply',
    description:
      'Batch engraved employee onboarding gift set with individual name customization and sharp contrast.',
    imageUrl:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
  {
    _id: 'port-9',
    title: 'High-Tolerance Prototype Laser Components',
    category: 'Custom Products',
    material: '2mm Precision Acrylic & Engineered Plywood',
    description:
      'Reusable high-detail laser cut components for architectural scale models and industrial prototyping.',
    imageUrl:
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=85',
    featured: true,
  },
];

// In-memory / edge enquiries store (can be connected to Cloudflare KV or D1)
const enquiriesStore = [];

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Radhe Laser Studio Cloudflare Worker API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Radhe Laser Studio Cloudflare Worker API',
    platform: 'Cloudflare Workers (Free Tier)',
    location: 'Gota, Ahmedabad, Gujarat',
    edge: true,
  });
});

// Portfolio listing
app.get('/api/portfolio', (c) => {
  const category = c.req.query('category');
  let items = portfolioItems;
  if (category && category !== 'All') {
    items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }
  return c.json({
    success: true,
    count: items.length,
    portfolio: items,
  });
});

// Submit customer quotation inquiry
app.post('/api/enquiries', async (c) => {
  try {
    let body = {};
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await c.req.json();
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      const formData = await c.req.parseBody();
      body = formData;
    }

    const {
      name,
      phone,
      email,
      companyName = '',
      service = 'CO2 Laser Cutting',
      product = 'Custom Project',
      material = 'Acrylic',
      quantity = '1',
      width = '',
      height = '',
      thickness = '',
      message = '',
      honeypot,
    } = body;

    // Honeypot anti-spam trap
    if (honeypot && String(honeypot).trim()) {
      return c.json({
        success: true,
        message: 'Thank you! Your enquiry has been received.',
      });
    }

    // Input Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return c.json({ success: false, message: 'Please provide your full name.' }, 400);
    }

    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return c.json(
        { success: false, message: 'Please enter a valid 10-digit mobile number.' },
        400
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return c.json({ success: false, message: 'Please enter a valid email address.' }, 400);
    }

    const enquiryId = 'RLS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    const enquiryData = {
      _id: enquiryId,
      name: String(name).trim().slice(0, 100),
      companyName: String(companyName).trim().slice(0, 100),
      phone: String(phone).trim().slice(0, 20),
      email: String(email).trim().toLowerCase().slice(0, 120),
      service: String(service).trim().slice(0, 100),
      product: String(product).trim().slice(0, 100),
      material: String(material).trim().slice(0, 100),
      quantity: String(quantity).trim().slice(0, 30),
      width: String(width).trim().slice(0, 30),
      height: String(height).trim().slice(0, 30),
      thickness: String(thickness).trim().slice(0, 30),
      message: String(message).trim().slice(0, 2000),
      status: 'New',
      createdAt: new Date().toISOString(),
    };

    enquiriesStore.unshift(enquiryData);

    // Direct WhatsApp quote URL generator
    const whatsappText = encodeURIComponent(
      `Hello Radhe Laser Studio! I just submitted a quote request for ${enquiryData.service} (${enquiryData.material}, Qty: ${enquiryData.quantity}). Name: ${enquiryData.name}. Phone: ${enquiryData.phone}. Ref ID: ${enquiryId}`
    );
    const whatsappUrl = `https://wa.me/917984190368?text=${whatsappText}`;

    return c.json(
      {
        success: true,
        message:
          'Thank you! Your enquiry has been received. We will review your requirement and contact you shortly.',
        enquiryId,
        whatsappUrl,
      },
      201
    );
  } catch (err) {
    return c.json({ success: false, message: err.message || 'Error processing request.' }, 500);
  }
});

// Admin Login
app.post('/api/admin/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const expectedUser = c.env?.ADMIN_USERNAME || 'admin';
    const expectedPass = c.env?.ADMIN_PASSWORD || 'radhe1140';

    if (username !== expectedUser || password !== expectedPass) {
      return c.json({ success: false, message: 'Invalid admin credentials.' }, 401);
    }

    // Mock token for Cloudflare Workers (or Web Crypto sign)
    const token =
      'cf-token-' + btoa(JSON.stringify({ user: username, exp: Date.now() + 7 * 86400 * 1000 }));

    return c.json({
      success: true,
      token,
      admin: {
        username,
        role: 'admin',
        loginTime: new Date().toISOString(),
      },
    });
  } catch (err) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Admin Stats
app.get('/api/admin/stats', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Authentication required' }, 401);
  }

  const stats = {
    total: enquiriesStore.length,
    new: enquiriesStore.filter((e) => e.status === 'New').length,
    contacted: enquiriesStore.filter((e) => e.status === 'Contacted').length,
    quoted: enquiriesStore.filter((e) => e.status === 'Quoted').length,
    inProduction: enquiriesStore.filter((e) => e.status === 'In Production').length,
    completed: enquiriesStore.filter((e) => e.status === 'Completed').length,
    cancelled: enquiriesStore.filter((e) => e.status === 'Cancelled').length,
  };

  return c.json({ success: true, stats });
});

// Admin Enquiries list
app.get('/api/enquiries', (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Authentication required' }, 401);
  }

  return c.json({
    success: true,
    count: enquiriesStore.length,
    enquiries: enquiriesStore,
  });
});

export default app;
