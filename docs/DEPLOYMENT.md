# Deployment Guide

## GitHub Pages Deployment

The 6-vertex model simulator is configured to deploy automatically to GitHub Pages when changes are pushed to the main branch.

### Initial Setup (One-time)

⚠️ **Important**: GitHub Pages must be enabled manually in the repository settings before the first deployment.

1. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
   - Click **Save**

2. **Verify Deployment**:
   - Push any change to the main branch (or trigger manually)
   - The deployment workflow will run automatically
   - Check the Actions tab for deployment status
   - Once deployed, your app will be available at:
     ```
     https://[your-username].github.io/6v-simulator/
     ```

### How It Works

1. **Automatic Deployment**: Every push to `main` triggers the deployment workflow
2. **Build Process**: The app is built with production optimizations
3. **GitHub Pages**: The built files are deployed to GitHub Pages
4. **SPA Support**: Client-side routing is handled with a 404.html redirect

### Manual Deployment

You can trigger a deployment manually:

1. Go to the **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow** button

### Configuration Details

- **Base URL**: The app is configured to use `/6v-simulator/` as the base path
- **Vite Config**: Automatically detects GitHub Actions environment
- **React Router**: Configured with the correct basename
- **404 Handling**: SPA routes are preserved through 404.html redirect

### Troubleshooting

#### Deployment Fails with "Not Found" Error

**Problem**: GitHub Pages is not enabled for the repository.

**Solution**: Follow the Initial Setup steps above to enable GitHub Pages.

#### Routes Return 404

**Problem**: GitHub Pages doesn't handle client-side routing by default.

**Solution**: The 404.html redirect is already configured. If issues persist:
- Clear browser cache
- Check that the base URL is correct in vite.config.ts

#### Build Fails

**Problem**: Build errors in the workflow.

**Solution**:
1. Test the build locally: `GITHUB_ACTIONS=true npm run build`
2. Check Node version (should be 20+)
3. Review the error logs in GitHub Actions

### Local Testing

To test the production build locally with GitHub Pages configuration:

```bash
cd client
GITHUB_ACTIONS=true npm run build
npm run preview
```

Note: The preview will run on a different port and won't have the exact same routing as GitHub Pages.

### Monitoring Deployments

Check deployment status:
```bash
# View recent deployments
gh run list --workflow deploy.yml

# Watch a specific deployment
gh run watch [RUN_ID]

# View deployment logs
gh run view [RUN_ID] --log
```

### Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file in `client/public/` with your domain
2. Configure DNS settings with your domain provider
3. Update repository Pages settings with the custom domain

### Performance Optimization

The deployment includes:
- Minified JavaScript and CSS
- Optimized assets
- Gzip compression (handled by GitHub Pages)
- Browser caching (handled by GitHub Pages)

### Security

- The deployment workflow has minimal permissions
- Pages are served over HTTPS
- No secrets or sensitive data in the build