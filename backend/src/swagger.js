const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Bill By Billu API',
    description: 'AI-powered Invoice + GST for Indian Freelancers & SMBs',
    version: '1.0.0',
    contact: { name: 'Bill By Billu Support', email: 'support@billbybillu.com' },
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Development' },
    { url: 'https://bill-by-billu-api.onrender.com', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          businessName: { type: 'string' },
          gstNumber: { type: 'string' },
          plan: { type: 'string', enum: ['FREE', 'STARTER', 'GROWTH'] },
        },
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          invoiceNumber: { type: 'string' },
          invoiceDate: { type: 'string', format: 'date' },
          dueDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'] },
          totalAmount: { type: 'number' },
          totalTax: { type: 'number' },
          paymentStatus: { type: 'string', enum: ['PAID', 'UNPAID', 'PARTIAL'] },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          gstNumber: { type: 'string' },
          type: { type: 'string', enum: ['B2B', 'B2C'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          hsnCode: { type: 'string' },
          unitPrice: { type: 'number' },
          gstRate: { type: 'number' },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date' },
          description: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
          gstAmount: { type: 'number' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  businessName: { type: 'string' },
                  gstNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, token: { type: 'string' } } } } } },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged in', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, token: { type: 'string' } } } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
      },
    },
    '/api/invoices': {
      get: {
        summary: 'List invoices',
        tags: ['Invoices'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'paymentStatus', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Invoice list' } },
      },
      post: {
        summary: 'Create invoice',
        tags: ['Invoices'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, unitPrice: { type: 'number' }, gstRate: { type: 'number' } } } },
                  customerId: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
      },
    },
    '/api/invoices/{id}': {
      get: { summary: 'Get invoice', tags: ['Invoices'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Invoice details' } } },
      put: { summary: 'Update invoice', tags: ['Invoices'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Invoice updated' } } },
    },
    '/api/invoices/{id}/pdf': {
      get: { summary: 'Download invoice PDF', tags: ['Invoices'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'PDF file', content: { 'application/pdf': {} } } } },
    },
    '/api/invoices/{id}/payment': {
      put: { summary: 'Mark invoice as paid', tags: ['Invoices'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Payment recorded' } } },
    },
    '/api/customers': {
      get: { summary: 'List customers', tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Customer list' } } },
      post: { summary: 'Create customer', tags: ['Customers'], security: [{ bearerAuth: [] }], responses: { 201: { description: 'Customer created' } } },
    },
    '/api/products': {
      get: { summary: 'List products', tags: ['Products'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Product list' } } },
      post: { summary: 'Create product', tags: ['Products'], security: [{ bearerAuth: [] }], responses: { 201: { description: 'Product created' } } },
    },
    '/api/expenses': {
      get: { summary: 'List expenses', tags: ['Expenses'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Expense list' } } },
      post: { summary: 'Create expense', tags: ['Expenses'], security: [{ bearerAuth: [] }], responses: { 201: { description: 'Expense created' } } },
    },
    '/api/gstr1': {
      get: { summary: 'Generate GSTR-1', tags: ['GST'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'GSTR-1 data' } } },
    },
    '/api/payments/razorpay/link': {
      post: { summary: 'Create Razorpay payment link', tags: ['Payments'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Payment link' } } },
    },
  },
  tags: [
    { name: 'System', description: 'Health check' },
    { name: 'Auth', description: 'Authentication' },
    { name: 'Invoices', description: 'Invoice management' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Products', description: 'Product catalog' },
    { name: 'Expenses', description: 'Expense tracking' },
    { name: 'GST', description: 'GST returns' },
    { name: 'Payments', description: 'Payment integration' },
  ],
};

module.exports = swaggerSpec;
