import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's profile to fetch portal slug and business name
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('portal_slug, business_name')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!profile.portal_slug) {
      return NextResponse.json({ error: 'Portal slug not configured' }, { status: 400 });
    }

    // Get the app URL from environment or use default
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qtroisp.netlify.app';
    const portalUrl = `${appUrl}/portal/${profile.portal_slug}`;
    const businessName = profile.business_name || 'QTRO ISP MAN';

    // Generate the captive portal HTML
    const captivePortalHtml = generateCaptivePortalHTML(portalUrl, businessName);

    // Return as downloadable HTML file
    return new NextResponse(captivePortalHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="hotspot-login-${profile.portal_slug}.html"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating captive portal:', error);
    return NextResponse.json(
      { error: 'Failed to generate captive portal' },
      { status: 500 }
    );
  }
}

function generateCaptivePortalHTML(portalUrl: string, businessName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <title>${businessName} – Connect</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #eaf1fb;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 380px;
            margin: auto;
            padding: 24px;
            margin-top: 40px;
        }

        .card {
            background: #fff;
            border-radius: 14px;
            padding: 25px;
            box-shadow: 0 5px 18px rgba(0,0,0,0.08);
        }

        .brand {
            font-size: 28px;
            font-weight: bold;
            color: #7e22ce;
            text-align: center;
            margin-bottom: 6px;
        }

        .sub {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-bottom: 18px;
        }

        input[type="text"] {
            width: 100%;
            padding: 13px;
            border: 2px solid #dce2eb;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 16px;
            box-sizing: border-box;
        }

        .btn-login {
            width: 100%;
            padding: 13px;
            background: #f59e0b;
            border: none;
            color: #fff;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
        }

        .btn-login:hover {
            background: #ff7a00;
        }

        .error-box {
            background: #fee2e2;
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
            color: #991b1b;
            font-size: 14px;
            text-align: center;
        }

        .error-box strong {
            display: block;
            margin-bottom: 4px;
            font-size: 15px;
        }

        .divider {
            text-align: center;
            padding: 10px 0;
            color: #888;
            font-size: 13px;
        }

        .iframe-box {
            width: 100%;
            height: 480px;
            border: 2px solid #0a66cc;
            border-radius: 12px;
            overflow: hidden;
        }

        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .footer {
            text-align: center;
            margin-top: 18px;
            font-size: 12px;
            color: #666;
        }

        @media (max-width: 480px) {
            .container {
                padding: 16px;
                margin-top: 20px;
            }
            
            .card {
                padding: 20px;
            }
            
            .brand {
                font-size: 24px;
            }
            
            .iframe-box {
                height: 400px;
            }
        }
    </style>

</head>
<body>

<div class="container">
    <div class="card">
        <div class="brand">${businessName}</div>
        <div class="sub">Fast • Affordable • Reliable Wi-Fi</div>

        <!-- Error Message Display -->
        $(if error)
        <div class="error-box">
            <strong>⚠️ Login Failed</strong>
            $(error)
            <br><br>
            <small>Please check your voucher code or purchase a new voucher below.</small>
        </div>
        $(endif)

        <!-- Voucher Login Form -->
        <form name="login" action="$(link-login)" method="post">
            <input type="text" name="username" placeholder="Enter Voucher Code" required />
            <input type="hidden" name="password" value="voucher" />
            <button class="btn-login" type="submit">Connect Now</button>
        </form>

        <div class="divider">OR BUY VOUCHER BELOW</div>

        <!-- Iframe with User's Portal Page -->
        <div class="iframe-box">
            <iframe src="${portalUrl}" title="Buy Voucher"></iframe>
        </div>

    </div>

    <div class="footer">© 2025 ${businessName} • Powered by MikroTik Hotspot</div>
</div>

</body>
</html>`;
}