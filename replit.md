# Overview

This is a DNS IP migration tool for Cloudflare, built as a full-stack web application. The application allows users to connect to the Cloudflare API, scan DNS records across multiple zones, and perform bulk IP address migrations with progress tracking and backup functionality. It provides a comprehensive dashboard for managing DNS record changes during server migrations or infrastructure updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **UI Components**: Radix UI primitives with shadcn/ui design system and Tailwind CSS for styling
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Theme**: Dark/light mode support with CSS variables for consistent theming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses and structured error handling
- **Database Integration**: Drizzle ORM with PostgreSQL (Neon Database) for type-safe database operations
- **External API**: Custom Cloudflare API client for zone and DNS record management

## Database Schema
- **API Configuration**: Stores Cloudflare credentials and connection status
- **Zones**: Cloudflare zone information (domains)
- **DNS Records**: Complete DNS record data with metadata
- **Migration Jobs**: Job tracking with progress counters and status
- **Migration Status**: Individual record migration results
- **Backups**: DNS record backups with metadata
- **Activity Log**: System activity and audit trail

## Core Features
- **API Configuration**: Secure credential storage with connection testing
- **DNS Scanning**: Bulk retrieval of DNS records across all Cloudflare zones
- **IP Migration**: Batch IP address updates with progress tracking
- **Backup System**: Pre-migration backups with restore capability
- **Real-time Updates**: Live progress monitoring during migrations
- **Activity Logging**: Comprehensive audit trail of all operations

## Development Tools
- **Type Safety**: Shared TypeScript interfaces between frontend and backend
- **Database Migrations**: Drizzle Kit for schema management
- **Development Server**: Vite dev server with HMR and Express API proxy
- **Build Process**: Optimized production builds with tree shaking

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database operations and migrations

## Third-Party APIs
- **Cloudflare API**: DNS management and zone operations using email/API key authentication

## UI/UX Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

## Development Infrastructure
- **Replit**: Development environment with live reloading
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and compilation
- **ESBuild**: Production bundling for server code