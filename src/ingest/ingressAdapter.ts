import { enforcePacingCeiling, normalizeIngressText, PacingCeilingResult } from './gptLiveMockAdapter';

export type IngressSourceType = 'web' | 'voice' | 'ros' | 'wearable' | 'dao';

export interface IngressPayload {
  source: IngressSourceType;
  sessionId: string;
  rawInput: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface NormalizedIngress {
  sessionId: string;
  source: IngressSourceType;
  rawText: string;
  normalizedText: string;
  pacing: PacingCeilingResult;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Platform-agnostic ingress adapter that accepts inputs from web dashboards,
 * voice audio transcripts, edge wearables, ROS robotics nodes, or DAOs.
 */
export class PlatformIngressAdapter {
  /**
   * Ingests and normalizes any heterogeneous payload into a standardized, pacing-verified format.
   */
  static processPayload(payload: IngressPayload): NormalizedIngress {
    if (!payload.sessionId) {
      payload.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    const rawText = payload.rawInput || '';
    const normalizedText = normalizeIngressText(rawText);
    const pacing = enforcePacingCeiling(normalizedText, 2);

    return {
      sessionId: payload.sessionId,
      source: payload.source,
      rawText,
      normalizedText,
      pacing,
      timestamp: payload.timestamp ?? Date.now(),
      metadata: {
        platform: payload.source,
        ingestedAt: new Date().toISOString(),
        ...payload.metadata
      }
    };
  }

  /**
   * Helper to format a ROS (Robot Operating System) navigation/speech node payload.
   */
  static fromRosNode(nodeId: string, speechMessage: string, telemetry?: Record<string, any>): IngressPayload {
    return {
      source: 'ros',
      sessionId: `ros_${nodeId}_${Date.now()}`,
      rawInput: speechMessage,
      metadata: { nodeId, rosTelemetry: telemetry }
    };
  }

  /**
   * Helper to format an edge wearable (smart glasses/audio badge) payload.
   */
  static fromWearable(deviceId: string, audioTranscript: string, batteryLevel?: number): IngressPayload {
    return {
      source: 'wearable',
      sessionId: `wearable_${deviceId}_${Date.now()}`,
      rawInput: audioTranscript,
      metadata: { deviceId, batteryLevel }
    };
  }

  /**
   * Helper to format a DAO proposal/inquiry payload.
   */
  static fromDao(daoAddress: string, proposalSummary: string, voterAddress?: string): IngressPayload {
    return {
      source: 'dao',
      sessionId: `dao_${daoAddress}_${Date.now()}`,
      rawInput: proposalSummary,
      metadata: { daoAddress, voterAddress }
    };
  }

  /**
   * Helper to format standard Web dashboard payload.
   */
  static fromWebClient(sessionId: string, text: string): IngressPayload {
    return {
      source: 'web',
      sessionId,
      rawInput: text
    };
  }
}
