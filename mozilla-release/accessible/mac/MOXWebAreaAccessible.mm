/* -*- (Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset:) 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import "MOXWebAreaAccessible.h"

#include "nsCocoaUtils.h"
#include "DocAccessibleParent.h"

using namespace mozilla::a11y;

@implementation MOXWebAreaAccessible

- (NSURL* _Nullable)moxURL {
  if ([self isExpired]) {
    return nil;
  }

  nsAutoString url;
  if (mGeckoAccessible.IsAccessible()) {
    MOZ_ASSERT(mGeckoAccessible.AsAccessible()->IsDoc());
    DocAccessible* acc = mGeckoAccessible.AsAccessible()->AsDoc();
    acc->URL(url);
  } else {
    ProxyAccessible* proxy = mGeckoAccessible.AsProxy();
    proxy->URL(url);
  }

  if (url.IsEmpty()) {
    return nil;
  }

  return [NSURL URLWithString:nsCocoaUtils::ToNSString(url)];
}

- (NSNumber* _Nullable)moxLoaded {
  if ([self isExpired]) {
    return nil;
  }
  // We are loaded if we aren't busy or stale
  return @([self stateWithMask:(states::BUSY & states::STALE)] == 0);
}

// overrides
- (NSNumber* _Nullable)moxLoadingProgress {
  if ([self isExpired]) {
    return nil;
  }

  if ([self stateWithMask:states::STALE] != 0) {
    // We expose stale state until the document is ready (DOM is loaded and tree is
    // constructed) so we indicate load hasn't started while this state is present.
    return @0.0;
  }

  if ([self stateWithMask:states::BUSY] != 0) {
    // We expose state busy until the document and all its subdocuments are completely
    // loaded, so we indicate partial loading here
    return @0.5;
  }

  // if we are not busy and not stale, we are loaded
  return @1.0;
}

- (void)handleAccessibleEvent:(uint32_t)eventType {
  switch (eventType) {
    case nsIAccessibleEvent::EVENT_DOCUMENT_LOAD_COMPLETE:
      [self moxPostNotification:NSAccessibilityFocusedUIElementChangedNotification];
      if ((mGeckoAccessible.IsProxy() && mGeckoAccessible.AsProxy()->IsDoc() &&
           mGeckoAccessible.AsProxy()->AsDoc()->IsTopLevel()) ||
          (mGeckoAccessible.IsAccessible() && !mGeckoAccessible.AsAccessible()->IsRoot() &&
           mGeckoAccessible.AsAccessible()->AsDoc()->ParentDocument()->IsRoot())) {
        // we fire an AXLoadComplete event on top-level documents only
        [self moxPostNotification:@"AXLoadComplete"];
      } else {
        // otherwise the doc belongs to an iframe (IsTopLevelInContentProcess)
        // and we fire AXLayoutComplete instead
        [self moxPostNotification:@"AXLayoutComplete"];
      }
      break;
  }

  [super handleAccessibleEvent:eventType];
}

@end
